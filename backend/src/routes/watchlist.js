const express = require('express');
const { meaningfulChange } = require('../services/changeDetection');

module.exports = function (db) {
  const router = express.Router();

  router.post('/watchlists', async (req, res) => {
    const { userId, name } = req.body;
    const { rows } = await db.query(
      'INSERT INTO watchlists (user_id, name) VALUES ($1,$2) RETURNING *',
      [userId, name || 'My Watchlist']
    );
    res.json(rows[0]);
  });

  router.post('/watchlists/:id/items', async (req, res) => {
    const { symbol } = req.body;
    const { rows } = await db.query(
      `INSERT INTO watchlist_items (watchlist_id, symbol) VALUES ($1,$2)
       ON CONFLICT (watchlist_id, symbol) DO NOTHING RETURNING *`,
      [req.params.id, symbol.toUpperCase()]
    );
    res.json(rows[0] || { message: 'already tracked' });
  });

  router.delete('/watchlists/:id/items/:symbol', async (req, res) => {
    await db.query('DELETE FROM watchlist_items WHERE watchlist_id=$1 AND symbol=$2', [
      req.params.id,
      req.params.symbol.toUpperCase(),
    ]);
    res.json({ ok: true });
  });

  /**
   * Batched version: 3 queries total regardless of watchlist size, instead
   * of 3 queries PER symbol. This is the answer to "how does this scale to
   * larger watchlists" — a 50-symbol watchlist costs the same query count
   * as a 5-symbol one.
   */
  router.get('/watchlists/:id/feed', async (req, res) => {
    const { rows: items } = await db.query(
      'SELECT * FROM watchlist_items WHERE watchlist_id=$1',
      [req.params.id]
    );

    if (!items.length) return res.json([]);

    const symbols = items.map((i) => i.symbol);

    // 1. Latest snapshot per symbol, in one query using DISTINCT ON
    const { rows: snapshots } = await db.query(
      `SELECT DISTINCT ON (symbol) *
       FROM price_snapshots
       WHERE symbol = ANY($1)
       ORDER BY symbol, fetched_at DESC`,
      [symbols]
    );
    const snapshotBySymbol = Object.fromEntries(snapshots.map((s) => [s.symbol, s]));

    // 2. All stats in one query
    const { rows: stats } = await db.query(
      'SELECT * FROM symbol_stats WHERE symbol = ANY($1)',
      [symbols]
    );
    const statsBySymbol = Object.fromEntries(stats.map((s) => [s.symbol, s]));

    // 3. All last-seen snapshots in one query
    const lastSeenIds = items.map((i) => i.last_seen_snapshot_id).filter(Boolean);
    let lastSeenById = {};
    if (lastSeenIds.length) {
      const { rows: lastSeenRows } = await db.query(
        'SELECT * FROM price_snapshots WHERE id = ANY($1)',
        [lastSeenIds]
      );
      lastSeenById = Object.fromEntries(lastSeenRows.map((r) => [r.id, r]));
    }

    const feed = [];
    const updates = [];

    for (const item of items) {
      const current = snapshotBySymbol[item.symbol];
      if (!current) continue; // not polled yet

      const stat = statsBySymbol[item.symbol] || {};
      const lastSeen = item.last_seen_snapshot_id
        ? lastSeenById[item.last_seen_snapshot_id]
        : null;

      const diff = meaningfulChange({ currentSnapshot: current, lastSeenSnapshot: lastSeen, stats: stat });

      feed.push({ symbol: item.symbol, price: current.price, fetchedAt: current.fetched_at, ...diff });
      updates.push({ itemId: item.id, snapshotId: current.id });
    }

    // Advance last-seen pointers — still one query per item, but this is a
    // write, not a read, and Postgres can batch it in a single round trip
    // via a single UPDATE ... FROM VALUES statement.
    if (updates.length) {
      const values = updates.map((u, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::int)`).join(',');
      const params = updates.flatMap((u) => [u.itemId, u.snapshotId]);
      await db.query(
        `UPDATE watchlist_items AS wi SET last_seen_snapshot_id = v.snapshot_id, last_seen_at = now()
         FROM (VALUES ${values}) AS v(item_id, snapshot_id)
         WHERE wi.id = v.item_id`,
        params
      );
    }

    feed.sort((a, b) => b.score - a.score);
    res.json(feed);
  });

  return router;
};
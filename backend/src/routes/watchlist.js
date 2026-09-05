const express = require('express');
const { meaningfulChange } = require('../services/changeDetection');

module.exports = function (db) {
  const router = express.Router();

  router.post('/watchlists', async (req, res) => {
    const { userId, name } = req.body;
    const existing = await db.query('SELECT * FROM watchlists WHERE user_id=$1 LIMIT 1', [userId]);
    if (existing.rows[0]) return res.json(existing.rows[0]);

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
   * Read-only now — does NOT advance last_seen. Polling for live prices
   * should never silently consume the "what changed since you looked"
   * signal. Marking as seen is a separate, explicit action (see
   * /mark-seen below), triggered only when the user actually opens the app.
   */
  router.get('/watchlists/:id/feed', async (req, res) => {
    const { rows: items } = await db.query(
      'SELECT * FROM watchlist_items WHERE watchlist_id=$1',
      [req.params.id]
    );

    if (!items.length) return res.json([]);

    const symbols = items.map((i) => i.symbol);

    const { rows: snapshots } = await db.query(
      `SELECT DISTINCT ON (symbol) *
       FROM price_snapshots
       WHERE symbol = ANY($1)
       ORDER BY symbol, fetched_at DESC`,
      [symbols]
    );
    const snapshotBySymbol = Object.fromEntries(snapshots.map((s) => [s.symbol, s]));

    const { rows: stats } = await db.query(
      'SELECT * FROM symbol_stats WHERE symbol = ANY($1)',
      [symbols]
    );
    const statsBySymbol = Object.fromEntries(stats.map((s) => [s.symbol, s]));

    const { rows: history } = await db.query(
      `SELECT symbol, price, fetched_at FROM price_snapshots
       WHERE symbol = ANY($1) ORDER BY symbol, fetched_at DESC`,
      [symbols]
    );
    const historyBySymbol = {};
    for (const row of history) {
      if (!historyBySymbol[row.symbol]) historyBySymbol[row.symbol] = [];
      if (historyBySymbol[row.symbol].length < 15) historyBySymbol[row.symbol].push(Number(row.price));
    }
    for (const sym in historyBySymbol) historyBySymbol[sym].reverse();

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

    for (const item of items) {
      const current = snapshotBySymbol[item.symbol];
      if (!current) continue;

      const stat = statsBySymbol[item.symbol] || {};
      const lastSeen = item.last_seen_snapshot_id
        ? lastSeenById[item.last_seen_snapshot_id]
        : null;

      const diff = meaningfulChange({ currentSnapshot: current, lastSeenSnapshot: lastSeen, stats: stat });

      feed.push({
        symbol: item.symbol,
        price: current.price,
        fetchedAt: current.fetched_at,
        history: historyBySymbol[item.symbol] || [],
        ...diff,
      });
    }

    feed.sort((a, b) => b.score - a.score);
    res.json(feed);
  });

  /**
   * Explicit "I've seen this" action — called once when the app loads,
   * not on every background poll. This is what makes "what changed since
   * you last checked" mean something real instead of resetting every 15s.
   */
  router.post('/watchlists/:id/mark-seen', async (req, res) => {
    const { rows: items } = await db.query(
      'SELECT * FROM watchlist_items WHERE watchlist_id=$1',
      [req.params.id]
    );
    const symbols = items.map((i) => i.symbol);
    if (!symbols.length) return res.json({ ok: true });

    const { rows: snapshots } = await db.query(
      `SELECT DISTINCT ON (symbol) * FROM price_snapshots WHERE symbol = ANY($1) ORDER BY symbol, fetched_at DESC`,
      [symbols]
    );
    const snapshotBySymbol = Object.fromEntries(snapshots.map((s) => [s.symbol, s]));

    for (const item of items) {
      const snap = snapshotBySymbol[item.symbol];
      if (snap) {
        await db.query(
          'UPDATE watchlist_items SET last_seen_snapshot_id=$1, last_seen_at=now() WHERE id=$2',
          [snap.id, item.id]
        );
      }
    }
    res.json({ ok: true });
  });

  return router;
};
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

  router.get('/watchlists/:id/feed', async (req, res) => {
    const { rows: items } = await db.query(
      'SELECT * FROM watchlist_items WHERE watchlist_id=$1',
      [req.params.id]
    );

    const feed = [];

    for (const item of items) {
      const { rows: snapRows } = await db.query(
        'SELECT * FROM price_snapshots WHERE symbol=$1 ORDER BY fetched_at DESC LIMIT 1',
        [item.symbol]
      );
      const current = snapRows[0];
      if (!current) continue;

      const { rows: statRows } = await db.query('SELECT * FROM symbol_stats WHERE symbol=$1', [
        item.symbol,
      ]);
      const stats = statRows[0] || {};

      let lastSeen = null;
      if (item.last_seen_snapshot_id) {
        const { rows } = await db.query('SELECT * FROM price_snapshots WHERE id=$1', [
          item.last_seen_snapshot_id,
        ]);
        lastSeen = rows[0];
      }

      const diff = meaningfulChange({ currentSnapshot: current, lastSeenSnapshot: lastSeen, stats });

      feed.push({ symbol: item.symbol, price: current.price, fetchedAt: current.fetched_at, ...diff });

      await db.query(
        'UPDATE watchlist_items SET last_seen_snapshot_id=$1, last_seen_at=now() WHERE id=$2',
        [current.id, item.id]
      );
    }

    feed.sort((a, b) => b.score - a.score);
    res.json(feed);
  });

  return router;
};
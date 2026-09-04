const { fetchQuote } = require('../services/marketData');

const POLL_INTERVAL_MS = 15_000;

function updateStats(prev, price, volume) {
  const alpha = 0.1;
  const prevMean = Number(prev.rolling_mean_price) || price;
  const prevStddev = Number(prev.rolling_stddev_price) || 0;
  const prevVolMean = Number(prev.rolling_mean_volume) || volume;
  const prevHigh = Number(prev.week52_high) || price;
  const prevLow = Number(prev.week52_low) || price;

  const newMean = prevMean + alpha * (price - prevMean);
  const variance = prevStddev ** 2;
  const newVariance = (1 - alpha) * (variance + alpha * (price - prevMean) ** 2);

  return {
    rolling_mean_price: newMean,
    rolling_stddev_price: Math.sqrt(newVariance) || price * 0.01,
    rolling_mean_volume: prevVolMean + alpha * (volume - prevVolMean),
    week52_high: Math.max(prevHigh, price),
    week52_low: Math.min(prevLow, price),
  };
}

async function pollOnce(db, distinctSymbols) {
  for (const symbol of distinctSymbols) {
    const quote = await fetchQuote(symbol);

    if (!quote) {
      const { rows } = await db.query(
        'SELECT * FROM price_snapshots WHERE symbol=$1 ORDER BY fetched_at DESC LIMIT 1',
        [symbol]
      );
      const last = rows[0];
      if (last) {
        await db.query(
          `INSERT INTO price_snapshots (symbol, price, volume, is_stale) VALUES ($1,$2,$3,true)`,
          [symbol, last.price, last.volume]
        );
      }
      continue;
    }

    await db.query(
      `INSERT INTO price_snapshots (symbol, price, volume, fetched_at, source_latency_ms, is_stale)
       VALUES ($1,$2,$3,$4,$5,false)`,
      [quote.symbol, quote.price, quote.volume, quote.fetched_at, quote.source_latency_ms]
    );

    const { rows: statRows } = await db.query('SELECT * FROM symbol_stats WHERE symbol=$1', [symbol]);
    const updated = updateStats(statRows[0] ?? {}, quote.price, quote.volume);

    await db.query(
      `INSERT INTO symbol_stats (symbol, rolling_mean_price, rolling_stddev_price, rolling_mean_volume, week52_high, week52_low, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6, now())
       ON CONFLICT (symbol) DO UPDATE SET
         rolling_mean_price=$2, rolling_stddev_price=$3, rolling_mean_volume=$4,
         week52_high=$5, week52_low=$6, updated_at=now()`,
      [symbol, updated.rolling_mean_price, updated.rolling_stddev_price, updated.rolling_mean_volume, updated.week52_high, updated.week52_low]
    );
  }
}

async function startPoller(db) {
  setInterval(async () => {
    const { rows } = await db.query('SELECT DISTINCT symbol FROM watchlist_items');
    const symbols = rows.map((r) => r.symbol);
    if (symbols.length) await pollOnce(db, symbols);
  }, POLL_INTERVAL_MS);
}

module.exports = { startPoller, pollOnce };
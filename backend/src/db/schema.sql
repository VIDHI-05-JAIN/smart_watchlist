CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE watchlists (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE watchlist_items (
  id SERIAL PRIMARY KEY,
  watchlist_id INT REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_snapshot_id INT,
  UNIQUE(watchlist_id, symbol)
);

CREATE TABLE price_snapshots (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  volume BIGINT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_latency_ms INT,
  is_stale BOOLEAN DEFAULT false
);

CREATE INDEX idx_snapshots_symbol_time ON price_snapshots(symbol, fetched_at DESC);

CREATE TABLE symbol_stats (
  symbol TEXT PRIMARY KEY,
  rolling_mean_price NUMERIC,
  rolling_stddev_price NUMERIC,
  rolling_mean_volume NUMERIC,
  week52_high NUMERIC,
  week52_low NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE watchlist_items
  ADD CONSTRAINT fk_last_seen_snapshot
  FOREIGN KEY (last_seen_snapshot_id) REFERENCES price_snapshots(id);
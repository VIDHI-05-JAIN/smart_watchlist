# Smart Market Watchlist — Groww Code 2026
**Live demo:** https://smart-watchlist-three.vercel.app
## The idea
Most watchlists show you numbers. This one decides what's worth your attention.

Instead of "here's today's % change," every symbol gets a **Signal Score (0-100)**
combining three things, each measured *relative to that stock's own normal
behavior* — not a flat threshold:
1. **Volatility-adjusted price move** — a z-score against the stock's own rolling
   mean/stddev. 2% in a sleepy utility stock scores higher than 2% in a volatile
   small-cap.
2. **Volume anomaly** — current volume vs. rolling average.
3. **Key-level crossing** — new 52-week high/low.

"What's changed since you last checked" is a **real per-user diff**: each
watchlist item stores a pointer to the snapshot you last actually saw, and the
feed diffs current state against *that*, not against "yesterday." Two users
checking at different times see different change feeds for the same stock.

## How this maps to the judging criteria

**Engineering depth** — symbols are polled once globally and fanned out to
every watchlist holding them (10,000 users watching AAPL = 1 poll, not
10,000). Rolling stats update incrementally (EMA), so cost per tick is O(1)
regardless of history length. The poller runs as a separate process from the
API server so request latency and polling cadence never couple.

**Product & problem interpretation** — the brief asks "what counts as
meaningful," not "show the price." A flat % threshold is the obvious
answer; a volatility-adjusted score relative to each stock's own behavior is
the one we believe should exist, because it's the same instinct a trader
already has ("is this big for THIS stock") made explicit.

**Edge cases & resilience** — the mock market data adapter simulates a ~5%
transient failure rate on purpose. On failure, the poller stores the
last-known price flagged `is_stale=true` instead of blocking or dropping the
symbol — the UI surfaces this explicitly (a stale banner, per-row tag) rather
than pretending the data is fresh. A symbol with no prior snapshot shows
"first look" rather than a fabricated 0% delta. An empty watchlist gets a
direct call to action, not a blank screen.

**Code quality & simplicity** — the data adapter sits behind one
`fetchQuote(symbol)` function so swapping in a real API (Alpha
Vantage/Finnhub) touches one file. No auth system was built beyond a single
hardcoded user — real auth wasn't what was being evaluated, and building it
would have traded polish elsewhere for depth nobody asked for.

**Originality & thoughtfulness** — the per-user "last seen" pointer is the
detail most watchlists skip: two people who check at different times
*should* see different change feeds for the same stock. That's a design
choice, not a default.

## Setup

**Backend:**
```bash
cd backend
npm install
createdb smart_watchlist
psql smart_watchlist < src/db/schema.sql
npm run dev
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev
```
Opens at `localhost:5173`. Backend must be running at `localhost:4000`.

## Current status
- Backend: watchlist CRUD, Signal Score engine, background poller, per-user
  diffing — done and tested.
- Frontend: add/remove symbols, live feed sorted by score, stale-data
  banner, first-look/empty states — done.
- Not done / known limitations (worth naming honestly rather than hiding):
  single hardcoded user, no real market data source (mock adapter, swappable
  by design), no deploy yet.

## Pitch (100 words)
Most watchlists just show today's price. Ours decides what deserves your
attention. Each stock gets a Signal Score combining a volatility-adjusted
price move, volume anomaly, and 52-week level crossings — so meaning is
relative to that stock's own normal behavior, not a flat percentage. "What
changed" is a real per-user diff against your last visit, not yesterday's
close — two people checking at different times see different feeds for the
same stock. Symbols are polled once and fanned out to every watchlist
holding them, so cost scales with distinct symbols, not users. Stale data is
shown explicitly, never hidden. Built end-to-end: Node/Express, PostgreSQL,
a background poller, React.

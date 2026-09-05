import Sparkline from './Sparkline';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export default function WatchlistFeed({ feed, onRemove, justAdded }) {
  if (!feed.length) {
    return (
      <p className="empty">
        Nothing here yet. Add a symbol above — you'll see its Signal Score once the first price comes in.
      </p>
    );
  }

  const anyStale = feed.some((item) => item.isStale);

  return (
    <>
      {anyStale && (
        <div className="stale-banner">
          Some prices are showing last-known values — the market data source didn't respond on the last check.
        </div>
      )}

      <div className="feed">
        {feed.map((item) => (
          <div
            key={item.symbol}
            className={`row ${item.isMeaningful ? 'meaningful' : ''} ${
              justAdded === item.symbol ? 'pulse' : ''
            }`}
          >
            <div className="row-main">
              <div className="row-top">
                <span className="symbol">{item.symbol}</span>
                <span className="price">${item.price}</span>
                <Sparkline data={item.history} positive={item.priceDeltaPct >= 0} />
                {item.priceDeltaPct === null ? (
                  <span className="delta neutral">first look</span>
                ) : (
                  <span className={`delta ${item.priceDeltaPct >= 0 ? 'up' : 'down'}`}>
                    {item.priceDeltaPct >= 0 ? '+' : ''}
                    {item.priceDeltaPct}% since last check
                  </span>
                )}
              </div>
              <div className="row-sub">
                <span className="score-badge">Signal {item.score}</span>
                {item.isStale && <span className="stale-tag">stale</span>}
                <span className="timestamp">{timeAgo(item.fetchedAt)}</span>
              </div>
              {item.reasons.length > 0 && (
                <ul className="reasons">
                  {item.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
            <button className="remove-btn" onClick={() => onRemove(item.symbol)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
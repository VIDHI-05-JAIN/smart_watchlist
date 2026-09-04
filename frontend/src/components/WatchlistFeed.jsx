export default function WatchlistFeed({ feed, onRemove }) {
  if (!feed.length) return <p className="empty">No symbols yet — add one above.</p>;

  return (
    <div className="feed">
      {feed.map((item) => (
        <div key={item.symbol} className={`card ${item.isMeaningful ? 'meaningful' : ''}`}>
          <div className="card-top">
            <span className="symbol">{item.symbol}</span>
            <span className="price">${item.price}</span>
            <button onClick={() => onRemove(item.symbol)}>×</button>
          </div>

          <div className="score-row">
            <span className="score">Signal {item.score}</span>
            {item.isStale && <span className="stale">stale</span>}
            {item.priceDeltaPct !== null && (
              <span className={item.priceDeltaPct >= 0 ? 'up' : 'down'}>
                {item.priceDeltaPct >= 0 ? '+' : ''}
                {item.priceDeltaPct}% since last check
              </span>
            )}
          </div>

          {item.reasons.length > 0 && (
            <ul className="reasons">
              {item.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
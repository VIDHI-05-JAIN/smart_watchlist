import { useEffect, useState, useCallback } from 'react';
import { createWatchlist, addSymbol, removeSymbol, getFeed, markSeen } from './api';
import AddSymbol from './components/AddSymbol';
import WatchlistFeed from './components/WatchlistFeed';
import './App.css';

const USER_ID = 1;

function App() {
  const [watchlistId, setWatchlistId] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(null);

  useEffect(() => {
    createWatchlist(USER_ID, 'My Watchlist').then((w) => setWatchlistId(w.id));
  }, []);

  const refresh = useCallback(() => {
    if (!watchlistId) return;
    setLoading(true);
    getFeed(watchlistId)
      .then(setFeed)
      .finally(() => setLoading(false));
  }, [watchlistId]);

  // On first load of a watchlist: show the diff against last visit, THEN
  // mark everything as seen for the NEXT visit. Fires once per watchlist
  // load, not on every 15s poll.
  useEffect(() => {
    if (!watchlistId) return;
    (async () => {
      await refresh();
      await markSeen(watchlistId);
    })();
  }, [watchlistId]);

  // Background price refresh only — does not touch last_seen.
  useEffect(() => {
    if (!watchlistId) return;
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [watchlistId, refresh]);

  const handleAdd = async (symbol) => {
    await addSymbol(watchlistId, symbol);
    setJustAdded(symbol);
    refresh();
    setTimeout(() => setJustAdded(null), 1500);
  };

  const handleRemove = async (symbol) => {
    await removeSymbol(watchlistId, symbol);
    refresh();
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>Smart Watchlist</h1>
        <span className="live-dot">live</span>
      </div>

      <AddSymbol onAdd={handleAdd} existing={feed.map((f) => f.symbol)} />
      {loading && <div className="loading-strip" />}
      <WatchlistFeed feed={feed} onRemove={handleRemove} justAdded={justAdded} />
    </div>
  );
}

export default App;
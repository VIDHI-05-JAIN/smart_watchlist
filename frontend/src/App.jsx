import { useEffect, useState, useCallback } from 'react';
import { createWatchlist, addSymbol, removeSymbol, getFeed } from './api';
import AddSymbol from './components/AddSymbol';
import WatchlistFeed from './components/WatchlistFeed';
import './App.css';

const USER_ID = 1; // hardcoded single-user for the hackathon build

function App() {
  const [watchlistId, setWatchlistId] = useState(
    () => localStorage.getItem('watchlistId') || null
  );
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!watchlistId) {
      createWatchlist(USER_ID, 'My Watchlist').then((w) => {
        localStorage.setItem('watchlistId', w.id);
        setWatchlistId(w.id);
      });
    }
  }, [watchlistId]);

  const refresh = useCallback(() => {
    if (!watchlistId) return;
    setLoading(true);
    getFeed(watchlistId)
      .then(setFeed)
      .finally(() => setLoading(false));
  }, [watchlistId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 20_000); // poll for updates
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAdd = async (symbol) => {
    await addSymbol(watchlistId, symbol);
    refresh();
  };

  const handleRemove = async (symbol) => {
    await removeSymbol(watchlistId, symbol);
    refresh();
  };

  return (
    <div className="app">
      <h1>Smart Watchlist</h1>
      <AddSymbol onAdd={handleAdd} />
      {loading && <p className="loading">Refreshing…</p>}
      <WatchlistFeed feed={feed} onRemove={handleRemove} />
    </div>
  );
}

export default App;
import { useEffect, useState, useCallback } from 'react';
import { createWatchlist, addSymbol, removeSymbol, getFeed } from './api';
import AddSymbol from './components/AddSymbol';
import WatchlistFeed from './components/WatchlistFeed';
import './App.css';

const USER_ID = 1;

function App() {
  const [watchlistId, setWatchlistId] = useState(
    () => localStorage.getItem('watchlistId') || null
  );
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(null);

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
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

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
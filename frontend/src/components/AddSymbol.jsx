import { useState } from 'react';

const SUGGESTIONS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL'];

export default function AddSymbol({ onAdd, existing }) {
  const [symbol, setSymbol] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    onAdd(symbol.trim().toUpperCase());
    setSymbol('');
  };

  const available = SUGGESTIONS.filter((s) => !existing.includes(s));

  return (
    <>
      <form onSubmit={submit} className="add-symbol">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Add a symbol — e.g. AAPL"
        />
        <button type="submit">Add</button>
      </form>
      {available.length > 0 && (
        <div className="quick-add">
          {available.map((s) => (
            <button key={s} type="button" onClick={() => onAdd(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
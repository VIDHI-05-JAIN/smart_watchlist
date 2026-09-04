import { useState } from 'react';

export default function AddSymbol({ onAdd }) {
  const [symbol, setSymbol] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    onAdd(symbol.trim().toUpperCase());
    setSymbol('');
  };

  return (
    <form onSubmit={submit} className="add-symbol">
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="e.g. AAPL"
      />
      <button type="submit">Add</button>
    </form>
  );
}
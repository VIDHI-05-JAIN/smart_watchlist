const seedPrices = {};

function seed(symbol) {
  if (!seedPrices[symbol]) {
    seedPrices[symbol] = 100 + Math.random() * 900;
  }
  return seedPrices[symbol];
}

async function fetchQuote(symbol) {
  if (Math.random() < 0.05) return null;

  const prev = seed(symbol);
  const drift = (Math.random() - 0.5) * 0.04;
  const spike = Math.random() < 0.1 ? (Math.random() - 0.5) * 0.15 : 0;
  const price = Number((prev * (1 + drift + spike)).toFixed(2));
  seedPrices[symbol] = price;

  const baseVolume = 500000;
  const volume = Math.floor(baseVolume * (0.5 + Math.random() * (spike !== 0 ? 3 : 1.2)));
  const source_latency_ms = Math.floor(Math.random() * 3000);

  return { symbol, price, volume, fetched_at: new Date(), source_latency_ms };
}

module.exports = { fetchQuote };
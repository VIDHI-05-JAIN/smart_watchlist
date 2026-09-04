const WEIGHTS = { volatility: 0.5, volume: 0.3, keyLevel: 0.2 };
const SIGNAL_THRESHOLD = 40;

function zScore(current, mean, stddev) {
  if (!stddev || stddev === 0) return 0;
  return (current - mean) / stddev;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function computeSignalScore(snapshot, stats) {
  const reasons = [];

  const z = zScore(snapshot.price, stats.rolling_mean_price, stats.rolling_stddev_price);
  const volatilityComponent = clamp01(Math.abs(z) / 3);
  if (Math.abs(z) >= 1.5) {
    reasons.push(`Price move is ${Math.abs(z).toFixed(1)}σ from this stock's normal range`);
  }

  const volRatio = stats.rolling_mean_volume ? snapshot.volume / stats.rolling_mean_volume : 1;
  const volumeComponent = clamp01((volRatio - 1) / 2);
  if (volRatio >= 1.8) {
    reasons.push(`Volume is ${volRatio.toFixed(1)}x the recent average`);
  }

  let keyLevelComponent = 0;
  if (stats.week52_high && snapshot.price >= stats.week52_high) {
    keyLevelComponent = 1;
    reasons.push('New 52-week high');
  } else if (stats.week52_low && snapshot.price <= stats.week52_low) {
    keyLevelComponent = 1;
    reasons.push('New 52-week low');
  }

  const score = Math.round(
    100 * (WEIGHTS.volatility * volatilityComponent + WEIGHTS.volume * volumeComponent + WEIGHTS.keyLevel * keyLevelComponent)
  );

  return { score, reasons, isStale: !!snapshot.is_stale };
}

function meaningfulChange({ currentSnapshot, lastSeenSnapshot, stats }) {
  const current = computeSignalScore(currentSnapshot, stats);

  if (!lastSeenSnapshot) {
    return { ...current, isMeaningful: current.score >= SIGNAL_THRESHOLD, priceDeltaPct: null };
  }

  const priceDeltaPct = ((currentSnapshot.price - lastSeenSnapshot.price) / lastSeenSnapshot.price) * 100;

  return {
    score: current.score,
    reasons: current.reasons,
    isStale: current.isStale,
    isMeaningful: current.score >= SIGNAL_THRESHOLD,
    priceDeltaPct: +priceDeltaPct.toFixed(2),
    sinceLastSeen: lastSeenSnapshot.fetched_at,
  };
}

module.exports = { computeSignalScore, meaningfulChange, SIGNAL_THRESHOLD };
export default function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return <span className="sparkline-empty">—</span>;

  const width = 70;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="sparkline">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#4ADE80' : '#F87171'}
        strokeWidth="1.5"
      />
    </svg>
  );
}
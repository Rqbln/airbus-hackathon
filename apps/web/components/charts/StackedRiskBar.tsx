"use client";

/** Single 100%-stacked horizontal bar showing low / mid / high split. */
export function StackedRiskBar({
  low,
  mid,
  high,
  height = 14,
}: {
  low: number;
  mid: number;
  high: number;
  height?: number;
}) {
  const total = low + mid + high || 1;
  const lp = (low / total) * 100;
  const mp = (mid / total) * 100;
  const hp = (high / total) * 100;
  return (
    <div className="w-full flex rounded-sm overflow-hidden border border-line-subtle" style={{ height }}>
      <div className="bg-risk-low/60" style={{ width: `${lp}%` }} title={`Low: ${low.toLocaleString()}`} />
      <div className="bg-risk-mid/70" style={{ width: `${mp}%` }} title={`Mid: ${mid.toLocaleString()}`} />
      <div className="bg-risk-high/70" style={{ width: `${hp}%` }} title={`High: ${high.toLocaleString()}`} />
    </div>
  );
}

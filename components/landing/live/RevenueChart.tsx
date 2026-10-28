"use client";

function buildPath(points: number[]) {
  return points
    .map((value, index) => `${index === 0 ? "M" : "L"}${index * 10},${92 - value * 0.78}`)
    .join(" ");
}

export default function RevenueChart({ points }: { points: number[] }) {
  const linePath = buildPath(points);
  const areaPath = `${linePath} L590,100 L0,100 Z`;

  return (
    <div className="min-w-0 rounded-2xl border border-line bg-card/70 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-800">Revenue pulse</p>
          <p className="mt-0.5 text-xs text-ink-500">Last 60 seconds</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-good-100 px-2.5 py-1 text-[10px] font-semibold text-good-700">
          <span className="h-1.5 w-1.5 rounded-full bg-good-600" />
          LIVE
        </span>
      </div>
      <svg className="live-revenue-chart block h-[132px] w-full overflow-visible" viewBox="0 0 590 100" preserveAspectRatio="none" role="img" aria-label="Revenue activity over the last 60 seconds">
        <defs>
          <linearGradient id="live-revenue-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[20, 45, 70, 95].map((y) => (
          <line key={y} x1="0" x2="590" y1={y} y2={y} stroke="var(--color-line)" strokeDasharray="3 7" />
        ))}
        <path className="live-chart-area" d={areaPath} fill="url(#live-revenue-fill)" />
        <path className="live-chart-line" d={linePath} fill="none" stroke="var(--color-accent-500)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        <circle className="live-chart-head" cx="589" cy={92 - points[points.length - 1] * 0.78} r="3.5" fill="var(--color-accent-bright)" />
      </svg>
    </div>
  );
}

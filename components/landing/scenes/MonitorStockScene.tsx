import SceneChrome from './SceneChrome';
import { WALKTHROUGH_DASHBOARD_BARS } from '../walkthroughData';

export default function MonitorStockScene({
  progress,
  active,
}: {
  progress: number;
  active: boolean;
}) {
  const showBadge = progress >= 0.56;
  const growingProgress = Math.min(progress / 0.65, 1);

  return (
    <SceneChrome active={active}>
      <div className="grid h-[calc(100%-2rem)] grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.8fr)] gap-2 p-2.5 sm:gap-4 sm:p-5">
        <div className="min-w-0 rounded-lg border border-line bg-card p-2 sm:p-4">
          <div className="flex items-start justify-between gap-1">
            <div>
              <p className="text-[10px] font-semibold text-ink-900 sm:text-sm">Stock overview</p>
              <p className="text-[9px] text-ink-500 sm:text-[11px]">Weekly stock movement</p>
            </div>
            <span className="rounded bg-subtle px-1.5 py-0.5 text-[8px] text-ink-500 sm:text-[10px]">This week</span>
          </div>
          <div className="mt-2 flex h-[68%] items-end justify-around gap-1 border-b border-line px-1 sm:mt-3">
            {WALKTHROUGH_DASHBOARD_BARS.map((bar, index) => {
              const height = Math.max(6, bar.height * growingProgress);
              const isLowStock = 'lowStock' in bar && progress >= 0.42;
              return (
                <div key={bar.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span
                    className={`w-full max-w-8 rounded-t-sm ${isLowStock ? 'bg-warn-500' : 'bg-accent-500'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[8px] text-ink-500 sm:text-[10px]">{bar.label}</span>
                  {index === 4 && isLowStock ? (
                    <span className="sr-only">Low stock</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-2">
          <div className="rounded-lg border border-line bg-card p-2 sm:p-3">
            <p className="text-[9px] text-ink-500 sm:text-[11px]">Active products</p>
            <p className="font-serif text-base font-bold text-ink-900 sm:text-2xl">128</p>
          </div>
          <div className={`rounded-lg border border-warn-600/30 bg-warn-100 p-2 transition-all duration-300 sm:p-3 ${showBadge ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
            <div className="flex items-center gap-1.5 text-warn-700">
              <svg
                aria-hidden="true"
                className={`h-3.5 w-3.5 shrink-0 ${showBadge ? 'walkthrough-bell-shake' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" />
              </svg>
              <p className="text-[9px] font-bold sm:text-xs">Low Stock</p>
            </div>
            <p className="mt-1 text-[8px] leading-tight text-warn-700 sm:text-[10px]">
              Galvanized Nails are below reorder level.
            </p>
          </div>
        </div>
      </div>
    </SceneChrome>
  );
}

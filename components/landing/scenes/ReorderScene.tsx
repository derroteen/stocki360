import SceneChrome from './SceneChrome';
import { WALKTHROUGH_PRODUCT, WALKTHROUGH_STOCK } from '../walkthroughData';

export default function ReorderScene({
  progress,
  active,
}: {
  progress: number;
  active: boolean;
}) {
  const ordered = progress >= 0.52;
  const recovered = progress >= 0.76;

  return (
    <SceneChrome active={active}>
      <div className="flex h-[calc(100%-2rem)] flex-col justify-between p-2.5 sm:p-5">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-warn-600/30 bg-warn-100 px-2.5 py-2 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-warn-700 sm:text-xs">Reorder reminder</p>
            <p className="truncate text-[10px] font-bold text-ink-900 sm:text-sm">{WALKTHROUGH_PRODUCT.name}</p>
            <p className="text-[9px] text-ink-600 sm:text-[11px]">4 units left · below reorder level</p>
          </div>
          <span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold sm:px-3 sm:py-1.5 sm:text-xs ${ordered ? 'bg-good-100 text-good-700' : 'bg-accent-600 text-white'}`}>
            {ordered ? 'Ordered' : 'Reorder'}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 py-1 text-ink-400 sm:gap-4">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[9px] text-ink-500 sm:text-xs">
            {ordered ? 'Purchase order created' : 'One tap to create a purchase'}
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 sm:px-5 sm:py-3">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-ink-500 sm:text-[11px]">Stock recovered</p>
            <p className="text-[10px] text-ink-700 sm:text-sm">{WALKTHROUGH_PRODUCT.name}</p>
          </div>
          <p className="font-serif text-xl font-bold tabular-nums text-ink-900 sm:text-3xl">
            {recovered ? WALKTHROUGH_STOCK.reorder : 4}
            <span className="ml-1 text-[9px] font-medium text-ink-500 sm:text-xs">units</span>
          </p>
        </div>

        <div className={`flex items-center justify-center gap-1.5 text-good-700 transition-opacity duration-300 ${progress >= 0.9 ? 'opacity-100' : 'opacity-0'}`}>
          <svg
            aria-hidden="true"
            className="h-4 w-4 sm:h-5 sm:w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
          </svg>
          <span className="text-[10px] font-semibold sm:text-xs">Never run out by surprise.</span>
        </div>
      </div>
    </SceneChrome>
  );
}

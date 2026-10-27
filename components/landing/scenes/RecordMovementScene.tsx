import SceneChrome from './SceneChrome';
import { WALKTHROUGH_PRODUCT, WALKTHROUGH_STOCK } from '../walkthroughData';

export default function RecordMovementScene({
  progress,
  active,
}: {
  progress: number;
  active: boolean;
}) {
  const purchased = progress >= 0.35;
  const sold = progress >= 0.78;
  const stock = sold
    ? WALKTHROUGH_STOCK.sale
    : purchased
      ? WALKTHROUGH_STOCK.purchase
      : WALKTHROUGH_STOCK.opening;

  return (
    <SceneChrome active={active}>
      <div className="grid h-[calc(100%-2rem)] grid-cols-2 gap-2 p-2.5 sm:gap-4 sm:p-5">
        <div className="flex min-w-0 flex-col justify-between rounded-lg border border-line bg-subtle p-2.5 sm:p-4">
          <div>
            <p className="text-[10px] font-semibold text-ink-900 sm:text-sm">New purchase</p>
            <p className="mt-1 truncate text-[9px] text-ink-500 sm:text-xs">{WALKTHROUGH_PRODUCT.name}</p>
          </div>
          <div className="flex items-end justify-between gap-1">
            <div>
              <p className="text-[9px] text-ink-500 sm:text-[11px]">Quantity received</p>
              <p className="text-xs font-bold text-ink-800 sm:text-base">+50 units</p>
            </div>
            <span className={`rounded-md px-2 py-1 text-[9px] font-semibold sm:text-[11px] ${purchased ? 'bg-good-100 text-good-700' : 'bg-accent-600 text-white'}`}>
              {purchased ? 'Received' : 'Add stock'}
            </span>
          </div>
        </div>

        <div className="relative flex min-w-0 flex-col justify-between rounded-lg border border-line bg-card p-2.5 sm:p-4">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-ink-900 sm:text-sm">New sale</p>
              <p className="mt-1 truncate text-[9px] text-ink-500 sm:text-xs">{WALKTHROUGH_PRODUCT.name}</p>
            </div>
            <span className="shrink-0 rounded bg-accent-50 px-1.5 py-1 font-mono text-[8px] text-accent-text sm:text-[10px]">
              {WALKTHROUGH_PRODUCT.barcode}
            </span>
          </div>
          <div>
            <div className="relative mb-2 h-5 overflow-hidden rounded border border-line bg-subtle sm:h-8">
              <div className="absolute inset-y-0 left-1/4 right-1/4 flex items-center justify-center gap-1 opacity-70">
                {[1, 2, 3, 4, 5, 6, 7].map((line) => (
                  <span key={line} className="h-3/4 bg-ink-700" style={{ width: `${line % 3 + 1}px` }} />
                ))}
              </div>
              <span
                className="walkthrough-scan-line absolute inset-y-0 w-0.5 bg-accent-500 shadow-[0_0_8px_var(--color-accent-500)]"
                style={{ left: `${Math.min(90, progress * 130)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] sm:text-xs">
              <span className="text-ink-500">{sold ? 'Sale complete' : 'Item in cart'}</span>
              <span className="font-semibold text-ink-800">1 × {WALKTHROUGH_PRODUCT.price}</span>
            </div>
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 sm:px-5 sm:py-3">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-ink-500 sm:text-[11px]">Current stock</p>
            <p className="text-xs text-ink-700 sm:text-sm">{WALKTHROUGH_PRODUCT.name}</p>
          </div>
          <p className={`font-serif text-xl font-bold tabular-nums sm:text-3xl ${stock <= 42 ? 'text-warn-700' : 'text-ink-900'}`}>
            {stock}
            <span className="ml-1 text-[9px] font-medium text-ink-500 sm:text-xs">units</span>
          </p>
        </div>
      </div>
    </SceneChrome>
  );
}

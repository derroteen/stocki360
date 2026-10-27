import SceneChrome from './SceneChrome';
import { WALKTHROUGH_PRODUCT } from '../walkthroughData';

function typedValue(value: string, progress: number, start: number, end: number) {
  const fieldProgress = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return value.slice(0, Math.ceil(value.length * fieldProgress));
}

export default function AddProductsScene({
  progress,
  active,
}: {
  progress: number;
  active: boolean;
}) {
  const showRow = progress >= 0.78;

  return (
    <SceneChrome active={active}>
      <div className="walkthrough-scene-grid grid h-[calc(100%-2rem)] grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[10rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-subtle p-3 sm:block">
          <p className="mb-3 text-xs font-semibold text-ink-800">Stocki360</p>
          <p className="rounded-md bg-accent-50 px-2 py-1.5 text-xs font-medium text-accent-text">
            Products
          </p>
          <p className="mt-2 px-2 py-1 text-xs text-ink-500">Dashboard</p>
          <p className="px-2 py-1 text-xs text-ink-500">Purchases</p>
        </aside>
        <div className="min-w-0 overflow-hidden p-2.5 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-900 sm:text-sm">Products</p>
              <p className="hidden text-[11px] text-ink-500 sm:block">Keep your catalog up to date</p>
            </div>
            <span className="shrink-0 rounded-md bg-accent-600 px-2 py-1 text-[10px] font-semibold text-white sm:px-3 sm:text-xs">
              + Add product
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:grid-cols-[minmax(0,1fr)_6rem_4rem_auto] sm:gap-2">
            <div className="col-span-2 min-w-0 rounded-md border border-line-strong bg-card px-2 py-1 sm:col-span-1 sm:py-1.5">
              <p className="text-[9px] text-ink-500 sm:text-[10px]">Product name</p>
              <p className="h-3 truncate text-[10px] font-medium text-ink-800 sm:h-4 sm:text-xs">
                {typedValue(WALKTHROUGH_PRODUCT.name, progress, 0.03, 0.48)}
                {progress >= 0.03 && progress < 0.48 ? (
                  <span className="walkthrough-caret ml-px border-r border-accent-500" />
                ) : null}
              </p>
            </div>
            <div className="min-w-0 rounded-md border border-line-strong bg-card px-2 py-1 sm:py-1.5">
              <p className="text-[9px] text-ink-500 sm:text-[10px]">Selling price</p>
              <p className="h-3 truncate text-[10px] font-medium text-ink-800 sm:h-4 sm:text-xs">
                {typedValue(WALKTHROUGH_PRODUCT.price, progress, 0.48, 0.62)}
              </p>
            </div>
            <div className="min-w-0 rounded-md border border-line-strong bg-card px-2 py-1 sm:py-1.5">
              <p className="text-[9px] text-ink-500 sm:text-[10px]">Quantity</p>
              <p className="h-3 text-[10px] font-medium text-ink-800 sm:h-4 sm:text-xs">
                {typedValue(String(WALKTHROUGH_PRODUCT.quantity), progress, 0.62, 0.7)}
              </p>
            </div>
            <div className="relative col-span-2 flex justify-end sm:col-span-1 sm:items-end">
              <span className="rounded-md bg-accent-600 px-3 py-1 text-[10px] font-semibold text-white sm:py-1.5 sm:text-xs">
                Save product
              </span>
              {progress > 0.68 && progress < 0.83 ? (
                <span
                  aria-hidden="true"
                  className="walkthrough-cursor absolute z-10 text-ink-900"
                  style={{
                    left: `${Math.min(88, 18 + ((progress - 0.68) / 0.15) * 65)}%`,
                    top: '0',
                  }}
                >
                  <svg className="h-5 w-5 drop-shadow" viewBox="0 0 24 24" fill="none">
                    <path d="M5 3.5v16l4.3-4.1 3.1 5.2 2.3-1.4-3.1-5.2H18L5 3.5Z" fill="currentColor" stroke="white" strokeWidth="1.5" />
                  </svg>
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-2 overflow-hidden rounded-md border border-line sm:mt-3">
            <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.5rem] bg-subtle px-2 py-1 text-[9px] font-semibold text-ink-500 sm:grid-cols-[minmax(0,1fr)_6rem_4rem] sm:text-[10px]">
              <span>Product</span><span>Price</span><span>Stock</span>
            </div>
            <div className={`grid grid-cols-[minmax(0,1fr)_3.5rem_2.5rem] px-2 py-1.5 text-[9px] text-ink-700 transition-opacity sm:grid-cols-[minmax(0,1fr)_6rem_4rem] sm:text-[10px] ${showRow ? 'opacity-100' : 'opacity-30'}`}>
              <span className="truncate">{WALKTHROUGH_PRODUCT.name}</span>
              <span>{WALKTHROUGH_PRODUCT.price}</span>
              <span>{WALKTHROUGH_PRODUCT.quantity}</span>
            </div>
          </div>
        </div>
      </div>
    </SceneChrome>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { LiveStockItem } from "./liveData";

function ReorderNotice({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const message = "Auto-reorder sent · restocking shortly";
  const [typedMessage, setTypedMessage] = useState("");

  useEffect(() => {
    if (!active || reducedMotion) return;

    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const typeNext = () => {
      index = Math.min(index + 1, message.length);
      setTypedMessage(message.slice(0, index));
      if (index < message.length) timeout = setTimeout(typeNext, 24);
    };
    timeout = setTimeout(typeNext, 24);

    return () => clearTimeout(timeout);
  }, [active, message, reducedMotion]);

  return (
    <p className="mt-1 text-[10px] font-medium text-warn-700">
      {reducedMotion ? message : typedMessage}
    </p>
  );
}

export default function StockLevels({
  products,
  active,
  reducedMotion,
}: {
  products: LiveStockItem[];
  active: boolean;
  reducedMotion: boolean;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-card/70 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-800">Stock on hand</h3>
          <p className="mt-0.5 text-xs text-ink-500">Products updating live</p>
        </div>
        <span className="rounded-full border border-line bg-subtle px-2.5 py-1 text-[10px] font-medium text-ink-500">6 SKUs</span>
      </div>
      <ul className="space-y-4">
        {products.map((product) => {
          const low = product.quantity <= product.threshold;
          const restocked = product.restockedFor > 0;
          const fill = Math.max(0, Math.min(1, product.quantity / product.maximum));
          const fillColor = low ? "var(--color-warn-500)" : restocked ? "var(--color-good-600)" : "var(--color-accent-500)";
          return (
            <li key={product.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="truncate text-xs font-medium text-ink-700">{product.name}</span>
                <span className={`shrink-0 text-[11px] font-semibold ${low ? "text-warn-700" : restocked ? "text-good-700" : "text-ink-600"}`}>
                  {product.quantity} units
                </span>
              </div>
              <div className={`live-stock-track h-2 overflow-hidden rounded-full bg-subtle-active ${low ? "live-stock-track--low" : ""}`}>
                <div
                  className="live-stock-fill h-full rounded-full"
                  style={{ transform: `scaleX(${fill})`, backgroundColor: fillColor }}
                />
              </div>
              {product.reorderIn !== null && (
                <ReorderNotice active={active} reducedMotion={reducedMotion} />
              )}
              {restocked && <p className="mt-1 text-[10px] font-medium text-good-700">Restocked · back on shelf</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

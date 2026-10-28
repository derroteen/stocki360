"use client";

import { useRef } from "react";
import ActivityFeed from "./live/ActivityFeed";
import CommandBar from "./live/CommandBar";
import LiveTicker from "./live/LiveTicker";
import MetricOdometer from "./live/MetricOdometer";
import RevenueChart from "./live/RevenueChart";
import StockLevels from "./live/StockLevels";
import useLiveSimulation from "./live/useLiveSimulation";

function ScannerMark({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-line bg-subtle text-ink-500">
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V5a1 1 0 0 1 1-1h2m12 0h2a1 1 0 0 1 1 1v2M4 17v2a1 1 0 0 0 1 1h2m12 0h2a1 1 0 0 0 1-1v-2M7 12h10M8 9v6m2-6v6m4-6v6m2-6v6" />
      </svg>
      {active && <span className="live-scan-sweep" />}
    </span>
  );
}

export default function LiveCommandCenter() {
  const sectionRef = useRef<HTMLElement>(null);
  const { state, clock, isVisible, isPlaying, prefersReducedMotion, togglePlayback } =
    useLiveSimulation(sectionRef);
  const totalStock = state.stock.reduce((total, item) => total + item.quantity, 0);
  const lowStock = state.stock.filter((item) => item.quantity <= item.threshold).length;

  const toggleFromKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.code === "Space" && event.target === event.currentTarget) {
      event.preventDefault();
      togglePlayback();
    }
  };

  const metrics = [
    { label: "Sales today", value: state.sales, prefix: "KES ", accent: "text-accent-link" },
    { label: "Orders", value: state.orders, prefix: "", accent: "text-ink-900" },
    { label: "Items in stock", value: totalStock, prefix: "", accent: "text-ink-900" },
    { label: "Low stock", value: lowStock, prefix: "", accent: lowStock > 0 ? "text-warn-700" : "text-good-700" },
  ];

  return (
    <section ref={sectionRef} className="border-b border-line bg-surface py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-link">Live demo</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-ink-900 sm:text-4xl">
            Stocki360, running right now
          </h2>
          <p className="mt-2 text-sm text-ink-600 sm:text-base">
            A live look at sales, stock movement, and timely reorders in a Kenyan hardware shop.
          </p>
        </div>

        <div
          role="group"
          aria-label="Simulated Stocki360 live command center demo"
          tabIndex={0}
          onKeyDown={toggleFromKeyboard}
          className="live-command-frame relative mx-auto max-w-6xl rounded-[1.6rem] p-px shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
          data-visible={isVisible}
        >
          <div
            className="live-command-panel relative overflow-hidden rounded-[calc(1.6rem-1px)] border border-line bg-card/90 p-3 backdrop-blur-xl sm:p-5 lg:p-6"
            data-playing={isPlaying}
          >
            <div className="relative z-10">
              <header className="mb-5 flex flex-col gap-4 border-b border-line pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-link">
                      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M5 20V8l7-4 7 4v12M8 11h2m4 0h2m-8 4h2m4 0h2m-4 5v-4h2v4" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-ink-900 sm:text-base">Mavuno Hardware</h3>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-good-100 px-2 py-0.5 text-[9px] font-bold tracking-widest text-good-700">
                          <span className="live-status-dot h-1.5 w-1.5 rounded-full bg-good-600" />
                          LIVE
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-ink-500">Simulated demo data · Nairobi, Kenya</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end rounded-lg border border-line bg-subtle/80 px-3 py-2 sm:self-auto">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-500">EAT</span>
                    <time className="font-mono text-sm font-semibold tabular-nums text-ink-800" dateTime={clock}>
                      {clock}
                    </time>
                  </div>
                </div>
                <CommandBar reducedMotion={prefersReducedMotion} active={isPlaying} />
              </header>

              <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                {metrics.map((metric, index) => (
                  <div key={metric.label} className="min-w-0 rounded-xl border border-line bg-card/75 p-3 sm:p-4">
                    <p className="truncate text-[10px] font-medium text-ink-500 sm:text-xs">{metric.label}</p>
                    <p className={`mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold tracking-tight sm:text-xl ${metric.accent}`}>
                      <MetricOdometer
                        value={metric.value}
                        prefix={metric.prefix}
                        suffix={index === 3 ? ` / ${state.stock.length}` : ""}
                      />
                    </p>
                    <p className="mt-1 text-[9px] text-ink-400">
                      {index === 0 ? "↑ 12.8% from yesterday" : index === 1 ? "M-Pesa + cash" : index === 2 ? "Across active products" : "Auto reorder enabled"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid min-w-0 gap-3 lg:grid-cols-12 lg:gap-4">
                <div className="min-w-0 lg:col-span-7">
                  <RevenueChart points={state.chart} />
                </div>
                <div className="min-w-0 lg:col-span-5">
                  <div className="mb-2 flex items-center justify-between lg:hidden">
                    <span className="text-xs font-medium text-ink-500">Till activity</span>
                    <ScannerMark active={state.scannerActive} />
                  </div>
                  <ActivityFeed
                    events={state.events}
                    reducedMotion={prefersReducedMotion}
                    active={isPlaying}
                  />
                </div>
                <div className="min-w-0 lg:col-span-12">
                  <StockLevels
                    products={state.stock}
                    active={isPlaying}
                    reducedMotion={prefersReducedMotion}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex items-center gap-2 text-[10px] text-ink-500">
                  <ScannerMark active={state.scannerActive} />
                  <span>
                    {state.scannerActive ? "Barcode scan detected" : "Barcode scanner ready"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={prefersReducedMotion ? "Live updates paused for reduced motion" : isPlaying ? "Pause live demo" : "Play live demo"}
                  title={prefersReducedMotion ? "Static frame for reduced motion" : undefined}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line-strong bg-card px-3.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  {prefersReducedMotion ? (
                    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5 3.5A1 1 0 0 1 6.5 2.64l6 3.75a1.9 1.9 0 0 1 0 3.22l-6 3.75A1 1 0 0 1 5 12.5v-9Z" />
                    </svg>
                  ) : isPlaying ? (
                    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 3h3v10H4zm5 0h3v10H9z" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5 3.5A1 1 0 0 1 6.5 2.64l6 3.75a1.9 1.9 0 0 1 0 3.22l-6 3.75A1 1 0 0 1 5 12.5v-9Z" />
                    </svg>
                  )}
                  {prefersReducedMotion ? "Static frame" : isPlaying ? "Pause demo" : "Play demo"}
                </button>
              </div>

              <LiveTicker items={state.ticker} reducedMotion={prefersReducedMotion} />
              <p className="sr-only">
                This simulated live dashboard shows a Nairobi hardware shop tracking KES sales, M-Pesa orders,
                barcode scans, inventory levels, low-stock alerts, and automatic reorders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

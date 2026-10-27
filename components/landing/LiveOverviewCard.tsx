'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './Typewriter';

type OverviewDataItem = {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  initial: boolean;
};

type Alert = Omit<OverviewDataItem, 'initial'>;

const LIVE_OVERVIEW_DATA: OverviewDataItem[] = [
  {
    id: 'galvanized-nails',
    name: 'Galvanized Nails 2.5 inch',
    stock: 6,
    threshold: 4,
    initial: true,
  },
  {
    id: 'paint-roller-set',
    name: 'Paint Roller Set',
    stock: 12,
    threshold: 8,
    initial: true,
  },
  {
    id: 'pvc-pipe',
    name: 'PVC Pipe 20mm',
    stock: 18,
    threshold: 10,
    initial: true,
  },
  {
    id: 'paint-brushes',
    name: 'Paint Brushes',
    stock: 3,
    threshold: 5,
    initial: false,
  },
  {
    id: 'packing-tape',
    name: 'Packing Tape',
    stock: 4,
    threshold: 6,
    initial: false,
  },
];

const INITIAL_ALERTS: Alert[] = LIVE_OVERVIEW_DATA.filter((item) => item.initial).map(
  ({ id, name, stock, threshold }) => ({ id, name, stock, threshold })
);
const THRESHOLD_ALERTS: Alert[] = LIVE_OVERVIEW_DATA.filter((item) => !item.initial).map(
  ({ id, name, stock, threshold }) => ({ id, name, stock, threshold })
);
const COUNT_TARGETS = { products: 128, lowStock: 7, updates: 24 };
const ACTIVITY_INTERVAL = 3500;
const COUNT_UP_DURATION = 850;

type Counts = typeof COUNT_TARGETS;

export default function LiveOverviewCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const isActiveRef = useRef(false);
  const countUpCompleteRef = useRef(false);
  const alertStepRef = useRef(0);
  const thresholdAlertIndexRef = useRef(0);
  const currentCountsRef = useRef<Counts>({ products: 0, lowStock: 0, updates: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();
  const [counts, setCounts] = useState<Counts>({ products: 0, lowStock: 0, updates: 0 });
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [syncing, setSyncing] = useState(false);
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);
  const [newAlertId, setNewAlertId] = useState<string | null>(null);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      if (isActiveRef.current) {
        callback();
      }
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) {
      return;
    }

    let isOnScreen = false;
    let isCountUpRunning = false;

    const runActivity = () => {
      if (!isActiveRef.current) {
        return;
      }

      setSyncing(true);
      schedule(() => setSyncing(false), 700);

      const step = alertStepRef.current;
      if (step === 2) {
        alertStepRef.current = 0;
        setAlerts(INITIAL_ALERTS);
        setNewAlertId(null);
        setHighlightedAlertId('galvanized-nails');
      } else {
        alertStepRef.current += 1;
        const nextStock = step === 0 ? 5 : 4;
        const crossedThreshold = nextStock === 4;
        const thresholdAlert = crossedThreshold
          ? THRESHOLD_ALERTS[
              thresholdAlertIndexRef.current % THRESHOLD_ALERTS.length
            ]
          : null;

        setAlerts((currentAlerts) => {
          const updated = currentAlerts.map((alert) =>
            alert.id === 'galvanized-nails' ? { ...alert, stock: nextStock } : alert
          );

          if (!thresholdAlert) {
            return updated;
          }

          return [
            { ...thresholdAlert },
            ...updated.filter((alert) => alert.id !== thresholdAlert.id),
          ].slice(0, 4);
        });
        if (thresholdAlert) {
          thresholdAlertIndexRef.current += 1;
          setNewAlertId(thresholdAlert.id);
        }
        setHighlightedAlertId(thresholdAlert?.id ?? 'galvanized-nails');
      }

      const nextCounts = { ...currentCountsRef.current, updates: currentCountsRef.current.updates + 1 };
      currentCountsRef.current = nextCounts;
      setCounts(nextCounts);

      schedule(() => setHighlightedAlertId(null), 900);
      schedule(() => setNewAlertId(null), 1200);
      schedule(runActivity, ACTIVITY_INTERVAL);
    };

    const startCountUp = () => {
      if (countUpCompleteRef.current || isCountUpRunning) {
        schedule(runActivity, ACTIVITY_INTERVAL);
        return;
      }

      isCountUpRunning = true;
      const start = performance.now();

      const updateCount = () => {
        if (!isActiveRef.current) {
          isCountUpRunning = false;
          return;
        }

        const progress = Math.min((performance.now() - start) / COUNT_UP_DURATION, 1);
        const nextCounts = {
          products: Math.round(COUNT_TARGETS.products * progress),
          lowStock: Math.round(COUNT_TARGETS.lowStock * progress),
          updates: Math.round(COUNT_TARGETS.updates * progress),
        };
        currentCountsRef.current = nextCounts;
        setCounts(nextCounts);

        if (progress === 1) {
          isCountUpRunning = false;
          countUpCompleteRef.current = true;
          schedule(runActivity, ACTIVITY_INTERVAL);
        } else {
          schedule(updateCount, 32);
        }
      };

      schedule(updateCount, 32);
    };

    const syncActivity = () => {
      const shouldRun =
        isOnScreen && !document.hidden && !prefersReducedMotion;

      if (shouldRun && !isActiveRef.current) {
        isActiveRef.current = true;
        if (!countUpCompleteRef.current && !isCountUpRunning) {
          startCountUp();
        } else {
          schedule(runActivity, ACTIVITY_INTERVAL);
        }
      } else if (!shouldRun && isActiveRef.current) {
        isActiveRef.current = false;
        isCountUpRunning = false;
        clearTimers();
        setSyncing(false);
        setHighlightedAlertId(null);
        setNewAlertId(null);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isOnScreen = entry.isIntersecting;
        syncActivity();
      },
      { threshold: 0.2 }
    );
    observer.observe(card);
    document.addEventListener('visibilitychange', syncActivity);

    return () => {
      isActiveRef.current = false;
      clearTimers();
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncActivity);
    };
  }, [clearTimers, prefersReducedMotion, schedule]);

  const displayedCounts = prefersReducedMotion ? COUNT_TARGETS : counts;
  const displayedAlerts = prefersReducedMotion ? INITIAL_ALERTS : alerts;
  const isSyncing = syncing && !prefersReducedMotion;

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border border-line bg-panel p-4 shadow-sm sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Stocki360 Overview</p>
          <p className="text-xs text-ink-500">Live inventory snapshot</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
            isSyncing
              ? 'border-accent-500/30 bg-accent-50 text-accent-text'
              : 'border-good-600/20 bg-good-100 text-good-700'
          }`}
          aria-live="polite"
        >
          {isSyncing ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500 motion-safe:animate-pulse" />
              Syncing...
            </>
          ) : (
            'Synced'
          )}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="min-w-0 rounded-xl border border-line bg-card p-2.5 sm:p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-500">Products</p>
          <p className="mt-1 font-serif text-2xl font-bold text-ink-900">
            {displayedCounts.products}
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-line bg-card p-2.5 sm:p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-500">Low Stock</p>
          <p className="mt-1 font-serif text-2xl font-bold text-warn-700">
            {displayedCounts.lowStock}
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-line bg-card p-2.5 sm:p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-500">Updates</p>
          <p className="mt-1 font-serif text-2xl font-bold text-accent-text">
            {displayedCounts.updates}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-card p-3 sm:p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
          Low stock alerts
        </p>
        <div className="space-y-2">
          {displayedAlerts.map((alert) => {
            const isLowStock = alert.stock <= alert.threshold;
            return (
              <div
                key={alert.id}
                className={`landing-alert-row flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                  isLowStock
                    ? 'bg-warn-100 text-warn-700'
                    : 'bg-subtle-strong text-ink-700'
                } ${highlightedAlertId === alert.id ? 'landing-alert-row--highlighted' : ''} ${
                    newAlertId === alert.id ? 'landing-alert-row--new' : ''
                }`}
              >
                <span className="min-w-0 truncate">{alert.name}</span>
                <span className="shrink-0 font-semibold">{alert.stock} left</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

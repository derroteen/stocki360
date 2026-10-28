"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WarehouseCanvas from "./warehouse/WarehouseCanvas";
import WarehousePoster from "./warehouse/WarehousePoster";
import {
  WAREHOUSE_LOOP_DURATION_MS,
  WAREHOUSE_PHASE_DURATION_MS,
  WAREHOUSE_PHASES,
  WAREHOUSE_STOCK_COUNTS,
} from "./warehouse/warehouseData";

export default function Warehouse3D() {
  const sectionRef = useRef<HTMLElement>(null);
  const elapsedRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const previousFrameRef = useRef<number | null>(null);
  const visibleRef = useRef(false);
  const userPausedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const lastRenderRef = useRef(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [lowEnd, setLowEnd] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [webglFailed, setWebglFailed] = useState(false);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    previousFrameRef.current = null;
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.3;
      visibleRef.current = visible;
      setIsVisible(visible);
      if (visible && !document.hidden && !reducedMotionRef.current && !userPausedRef.current) {
        setIsPlaying(true);
      } else if (!visible) {
        setIsPlaying(false);
      }
    }, { threshold: [0, 0.3, 1] });

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;
      setIsReducedMotion(motionQuery.matches);
      if (motionQuery.matches) setIsPlaying(false);
      else if (visibleRef.current && !document.hidden && !userPausedRef.current) setIsPlaying(true);
    };
    const syncTabVisibility = () => {
      setIsTabVisible(!document.hidden);
      if (document.hidden) setIsPlaying(false);
      else if (visibleRef.current && !reducedMotionRef.current && !userPausedRef.current) setIsPlaying(true);
    };
    const browserNavigator = navigator as Navigator & { deviceMemory?: number };
    setLowEnd(
      navigator.hardwareConcurrency <= 4 ||
        (browserNavigator.deviceMemory !== undefined && browserNavigator.deviceMemory <= 4),
    );

    observer.observe(section);
    motionQuery.addEventListener("change", syncMotionPreference);
    document.addEventListener("visibilitychange", syncTabVisibility);
    syncMotionPreference();
    syncTabVisibility();

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", syncTabVisibility);
      stop();
    };
  }, [stop]);

  useEffect(() => {
    if (!isPlaying || !isVisible || !isTabVisible || isReducedMotion || webglFailed) {
      stop();
      return;
    }

    const tick = (timestamp: number) => {
      if (previousFrameRef.current === null) previousFrameRef.current = timestamp;
      elapsedRef.current =
        (elapsedRef.current + timestamp - previousFrameRef.current) % WAREHOUSE_LOOP_DURATION_MS;
      previousFrameRef.current = timestamp;
      if (timestamp - lastRenderRef.current >= 100) {
        lastRenderRef.current = timestamp;
        const nextPhase = Math.floor(elapsedRef.current / WAREHOUSE_PHASE_DURATION_MS);
        setElapsed(elapsedRef.current);
        setPhase((current) => (current === nextPhase ? current : nextPhase));
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return stop;
  }, [isPlaying, isVisible, isTabVisible, isReducedMotion, webglFailed, stop]);

  useEffect(() => stop, [stop]);

  const jumpToPhase = (index: number) => {
    const nextElapsed = index * WAREHOUSE_PHASE_DURATION_MS;
    elapsedRef.current = nextElapsed;
    setElapsed(nextElapsed);
    setPhase(index);
    if (isReducedMotion) return;
    previousFrameRef.current = null;
  };

  const togglePlayback = () => {
    if (isReducedMotion || !isVisible || webglFailed) return;
    const next = !isPlaying;
    userPausedRef.current = !next;
    setIsPlaying(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.code === "Space" && event.target === event.currentTarget) {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      jumpToPhase((phase + 1) % WAREHOUSE_PHASES.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      jumpToPhase((phase - 1 + WAREHOUSE_PHASES.length) % WAREHOUSE_PHASES.length);
    }
  };

  const handleContextLost = useCallback(() => {
    setWebglFailed(true);
    setIsPlaying(false);
    stop();
  }, [stop]);

  const phaseProgress = isReducedMotion
    ? 0
    : (elapsed % WAREHOUSE_PHASE_DURATION_MS) / WAREHOUSE_PHASE_DURATION_MS;
  const stockCount =
    phase === 0
      ? isReducedMotion
        ? WAREHOUSE_STOCK_COUNTS[phase]
        : Math.round(phaseProgress * WAREHOUSE_STOCK_COUNTS[phase])
      : phase === 1
        ? isReducedMotion
          ? 50
          : phaseProgress < 0.45
            ? Math.round((phaseProgress / 0.45) * 50)
            : Math.round(50 - ((phaseProgress - 0.45) / 0.55) * 43)
        : WAREHOUSE_STOCK_COUNTS[phase];
  const active = isVisible && isTabVisible && isPlaying && !isReducedMotion && !webglFailed;

  return (
    <section ref={sectionRef} className="border-b border-line bg-surface py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-link">A closer look</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-ink-900 sm:text-4xl">Your stock, in 3D</h2>
          <p className="mt-2 text-sm text-ink-600 sm:text-base">Follow every product from arrival to reorder.</p>
        </div>

        <div
          className="mx-auto max-w-5xl rounded-2xl border border-line bg-card p-2 shadow-lg sm:p-4"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="group"
          aria-label="Stocki360 3D warehouse. Use Space to play or pause and arrow keys to change phases."
        >
          <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-subtle">
            {isVisible && !webglFailed ? (
              <WarehouseCanvas
                phase={phase}
                progress={phaseProgress}
                active={active}
                tabVisible={isTabVisible}
                reduced={isReducedMotion}
                lowEnd={lowEnd}
                onContextLost={handleContextLost}
              />
            ) : (
              <WarehousePoster />
            )}
            <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-line bg-card/95 px-3 py-1 text-xs font-semibold text-ink-800 shadow-sm">
              {WAREHOUSE_PHASES[phase].title}
            </div>
            <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-line bg-card/95 px-3 py-1 text-xs font-semibold text-ink-800 shadow-sm">
              {stockCount} units
            </div>
            <p className="pointer-events-none absolute bottom-3 left-3 right-3 text-center text-xs font-medium text-ink-700 sm:text-sm">
              {WAREHOUSE_PHASES[phase].caption}
            </p>
          </div>

          <div className="flex flex-col gap-3 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-2">
            <div className="flex items-center gap-2" role="group" aria-label="Warehouse animation phases">
              {WAREHOUSE_PHASES.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Jump to phase ${index + 1}: ${item.title}`}
                  aria-current={phase === index ? "step" : undefined}
                  onClick={() => jumpToPhase(index)}
                  className={`h-10 min-w-10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:min-w-12 ${
                    phase === index ? "bg-accent-600" : "bg-subtle-active hover:bg-accent-100"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={togglePlayback}
              disabled={isReducedMotion || webglFailed}
              aria-label={
                webglFailed
                  ? "3D animation unavailable"
                  : isReducedMotion
                    ? "Playback disabled by reduced motion preference"
                    : isPlaying
                      ? "Pause 3D warehouse animation"
                      : "Play 3D warehouse animation"
              }
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-line-strong px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
          {webglFailed && (
            <ol className="mt-4 grid gap-2 px-1 sm:grid-cols-2 sm:px-2">
              {WAREHOUSE_PHASES.map((item, index) => (
                <li key={item.title} className="rounded-lg border border-line bg-subtle p-3">
                  <p className="text-xs font-semibold text-accent-link">Step {index + 1}: {item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-600">{item.caption}</p>
                </li>
              ))}
            </ol>
          )}
          {isReducedMotion && (
            <p className="px-2 pt-2 text-xs text-ink-600">
              Reduced motion is enabled. Choose a phase to explore it as a still scene.
            </p>
          )}
          {lowEnd && <span className="sr-only">Reduced graphics mode enabled for this device.</span>}
        </div>
      </div>
    </section>
  );
}

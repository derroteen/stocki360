'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AddProductsScene from './scenes/AddProductsScene';
import MonitorStockScene from './scenes/MonitorStockScene';
import RecordMovementScene from './scenes/RecordMovementScene';
import ReorderScene from './scenes/ReorderScene';
import { usePrefersReducedMotion } from './Typewriter';
import {
  WALKTHROUGH_DURATION_MS,
  WALKTHROUGH_SCENE_DURATION_MS,
  WALKTHROUGH_SCENES,
} from './walkthroughData';

const SCENE_COMPONENTS = [
  AddProductsScene,
  RecordMovementScene,
  MonitorStockScene,
  ReorderScene,
] as const;

export default function ProductWalkthrough() {
  const playerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const previousFrameRef = useRef<number | null>(null);
  const lastRenderRef = useRef(0);
  const isVisibleRef = useRef(false);
  const userPausedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const stopFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    previousFrameRef.current = null;
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        isVisibleRef.current = visible;
        setIsVisible(visible);
        if (visible && !document.hidden && !userPausedRef.current && !prefersReducedMotion) {
          setIsPlaying(true);
        } else if (!visible) {
          setIsPlaying(false);
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
      } else if (isVisibleRef.current && !userPausedRef.current && !prefersReducedMotion) {
        setIsPlaying(true);
      }
    };

    observer.observe(player);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isPlaying || prefersReducedMotion || !isVisible || document.hidden) {
      stopFrame();
      return;
    }

    const tick = (timestamp: number) => {
      if (previousFrameRef.current === null) {
        previousFrameRef.current = timestamp;
      }
      const delta = timestamp - previousFrameRef.current;
      previousFrameRef.current = timestamp;
      elapsedRef.current = (elapsedRef.current + delta) % WALKTHROUGH_DURATION_MS;

      if (timestamp - lastRenderRef.current >= 80) {
        lastRenderRef.current = timestamp;
        setElapsedMs(elapsedRef.current);
        setSceneIndex(
          Math.floor(elapsedRef.current / WALKTHROUGH_SCENE_DURATION_MS)
        );
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return stopFrame;
  }, [isPlaying, isVisible, prefersReducedMotion, stopFrame]);

  useEffect(() => stopFrame, [stopFrame]);

  const jumpToScene = (index: number) => {
    const start = index * WALKTHROUGH_SCENE_DURATION_MS;
    elapsedRef.current = start;
    setElapsedMs(start);
    setSceneIndex(index);
  };

  const togglePlayback = () => {
    if (prefersReducedMotion || (!isPlaying && !isVisible)) {
      return;
    }
    const nextPlaying = !isPlaying;
    userPausedRef.current = !nextPlaying;
    setIsPlaying(nextPlaying);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.code === 'Space' && event.target === event.currentTarget) {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      jumpToScene((sceneIndex + 1) % WALKTHROUGH_SCENES.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      jumpToScene(
        (sceneIndex - 1 + WALKTHROUGH_SCENES.length) % WALKTHROUGH_SCENES.length
      );
    }
  };

  const Scene = SCENE_COMPONENTS[sceneIndex];
  const elapsedInScene = elapsedMs % WALKTHROUGH_SCENE_DURATION_MS;
  const sceneProgress = prefersReducedMotion
    ? 1
    : Math.min(elapsedInScene / WALKTHROUGH_SCENE_DURATION_MS, 1);
  const scene = WALKTHROUGH_SCENES[sceneIndex];
  const sceneFill = sceneProgress;
  const playbackActive = isPlaying && !prefersReducedMotion;

  return (
    <section className="border-b border-line bg-surface py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-link">
            A quick tour
          </p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-ink-900 sm:text-4xl">
            See how Stocki360 works
          </h2>
          <p className="mt-2 text-sm text-ink-600 sm:text-base">
            From your first product to the next timely reorder.
          </p>
        </div>

        <div
          ref={playerRef}
          className="mx-auto max-w-5xl rounded-2xl border border-line bg-card p-2 shadow-lg sm:p-4"
          data-playing={playbackActive}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label="Stocki360 product walkthrough player. Use Space to play or pause and arrow keys to change scenes."
        >
          <div className="relative aspect-video overflow-hidden rounded-xl bg-subtle">
            <div className="absolute inset-0 pb-9">
              <Scene progress={sceneProgress} active={playbackActive} />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-9 items-center border-t border-line bg-card/95 px-3">
              <p className="truncate text-[10px] font-medium text-ink-700 sm:text-xs" aria-live="polite">
                <span className="mr-2 font-semibold text-accent-link">
                  {String(sceneIndex + 1).padStart(2, '0')} / 04
                </span>
                {scene.caption}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-1 pt-3 sm:gap-4 sm:px-2">
            <button
              type="button"
              onClick={togglePlayback}
              disabled={prefersReducedMotion || (!isVisible && !isPlaying)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={
                prefersReducedMotion
                  ? 'Playback disabled by reduced motion preference'
                  : playbackActive
                    ? 'Pause walkthrough'
                    : 'Play walkthrough'
              }
              title={
                prefersReducedMotion
                  ? 'Use the scene buttons to step through the tour'
                  : undefined
              }
            >
              {isPlaying ? (
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="2" width="3.5" height="12" rx="1" />
                  <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                </svg>
              ) : (
                <svg aria-hidden="true" className="ml-0.5 h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2.75a1 1 0 0 1 1.52-.85l8.4 5.25a1 1 0 0 1 0 1.7l-8.4 5.25A1 1 0 0 1 4 13.25V2.75Z" />
                </svg>
              )}
            </button>

            <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5 sm:gap-2">
              {WALKTHROUGH_SCENES.map((item, index) => {
                const isCurrentScene = sceneIndex === index;
                const fill = isCurrentScene ? sceneFill : sceneIndex > index ? 1 : 0;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => jumpToScene(index)}
                    className="group min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    aria-label={`Jump to scene ${index + 1}: ${item.title}`}
                    aria-current={isCurrentScene ? 'step' : undefined}
                    title={item.title}
                  >
                    <span className="block h-1.5 overflow-hidden rounded-full bg-subtle-strong transition-colors group-hover:bg-line-strong sm:h-2">
                      <span
                        className="block h-full rounded-full bg-accent-600"
                        style={{ width: `${fill * 100}%` }}
                      />
                    </span>
                    <span className={`mt-1 hidden truncate text-left text-[10px] sm:block ${isCurrentScene ? 'font-semibold text-ink-800' : 'text-ink-500'}`}>
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="hidden shrink-0 text-[11px] tabular-nums text-ink-500 sm:block">
              {isVisible ? 'Now playing' : 'Ready'}
            </span>
          </div>
          {prefersReducedMotion ? (
            <p className="sr-only" aria-live="polite">
              Reduced motion is enabled. Select a scene button to step through the walkthrough.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

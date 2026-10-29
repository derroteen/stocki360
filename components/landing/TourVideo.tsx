"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import poster from "../../public/video/stocki360-tour-poster-v1.png";

const VIDEO_FILE = "stocki360-tour-v1.mp4";
const VIDEO_URL = `/video/${VIDEO_FILE}`;
const ASPECT_RATIO = "16 / 9";
const VIDEO_DESCRIPTION =
  "A 30-second Stocki360 product tour with burned-in captions. It has no audio.";

type NavigatorWithConnection = Navigator & {
  connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
};

function shouldBlockAutoplay(): boolean {
  const connection = (navigator as NavigatorWithConnection).connection;
  const connectionIsSlow =
    connection?.saveData === true ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g";

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || connectionIsSlow;
}

export default function TourVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inViewRef = useRef(false);
  const pausedByUserRef = useRef(false);
  const sourceLoadedRef = useRef(false);
  const startedManuallyRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const playVideo = useCallback((automatic: boolean) => {
    const video = videoRef.current;
    if (!video || hasFailed) {
      return;
    }

    if (
      automatic &&
      (document.hidden || !inViewRef.current || pausedByUserRef.current || shouldBlockAutoplay())
    ) {
      return;
    }

    if (!automatic) {
      startedManuallyRef.current = true;
      pausedByUserRef.current = false;
    } else {
      startedManuallyRef.current = false;
    }

    if (!sourceLoadedRef.current) {
      video.src = VIDEO_URL;
      sourceLoadedRef.current = true;
      video.load();
    }

    void video.play().catch(() => {
      // Autoplay can be denied by browser policy; keep the poster and controls usable.
    });
  }, [hasFailed]);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        inViewRef.current = isVisible;

        if (!isVisible) {
          pausedByUserRef.current = false;
          video.pause();
          return;
        }

        if (shouldBlockAutoplay()) {
          return;
        }

        playVideo(true);
      },
      { threshold: [0, 0.5] },
    );

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
        return;
      }

      if (inViewRef.current && !pausedByUserRef.current && !shouldBlockAutoplay()) {
        playVideo(true);
      }
    };

    const connection = (navigator as NavigatorWithConnection).connection;
    const handleAutoplayPreferenceChange = () => {
      if (shouldBlockAutoplay()) {
        if (!startedManuallyRef.current) {
          video.pause();
        }
        return;
      }

      if (inViewRef.current && !pausedByUserRef.current && !document.hidden) {
        playVideo(true);
      }
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    observer.observe(container);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotion.addEventListener("change", handleAutoplayPreferenceChange);
    connection?.addEventListener("change", handleAutoplayPreferenceChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotion.removeEventListener("change", handleAutoplayPreferenceChange);
      connection?.removeEventListener("change", handleAutoplayPreferenceChange);
      video.pause();
    };
  }, [playVideo]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!video.paused) {
      pausedByUserRef.current = true;
      startedManuallyRef.current = false;
      video.pause();
      return;
    }

    playVideo(false);
  };

  const enterFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      return;
    }

    if (container?.requestFullscreen) {
      void container.requestFullscreen().catch(() => {});
      return;
    }

    video?.webkitEnterFullscreen?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.code !== "Space" || event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    togglePlayback();
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-[1000px] overflow-hidden rounded-2xl border border-line bg-card shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/60"
      style={{ aspectRatio: ASPECT_RATIO, touchAction: "pan-y" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-describedby="stocki360-tour-description"
    >
      <p id="stocki360-tour-description" className="sr-only">
        {VIDEO_DESCRIPTION}
      </p>
      <Image
        src={poster}
        alt=""
        fill
        sizes="(max-width: 1000px) 100vw, 1000px"
        className="object-cover"
      />
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        aria-hidden="true"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setHasFailed(true)}
        className={`absolute inset-0 h-full w-full object-cover ${hasFailed ? "invisible" : ""}`}
        style={{ touchAction: "pan-y" }}
      />

      {!isPlaying && !hasFailed ? (
        <button
          type="button"
          onClick={() => playVideo(false)}
          aria-label="Play Stocki360 product tour"
          className="absolute inset-0 flex min-h-11 min-w-11 items-center justify-center bg-slate-950/25 text-white transition-colors hover:bg-slate-950/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-accent-500"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-600 text-3xl shadow-lg">
            <span aria-hidden="true">▶</span>
          </span>
        </button>
      ) : null}

      {!hasFailed ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/80 to-transparent p-3 pt-10">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? "Pause Stocki360 product tour" : "Play Stocki360 product tour"}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/40 bg-slate-950/65 px-3 text-sm font-semibold text-white hover:bg-slate-950/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-400"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={enterFullscreen}
            aria-label="View Stocki360 product tour fullscreen"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/40 bg-slate-950/65 px-3 text-sm font-semibold text-white hover:bg-slate-950/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-400"
          >
            Fullscreen
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePrefersReducedMotion } from "../Typewriter";
import {
  INITIAL_LIVE_STATE,
  type LiveEvent,
  type LiveEventKind,
  type LiveSimulationState,
} from "./liveData";

const TICK_MS = 1000;
const MAX_TICK = 3600;

function subscribeToTabVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getTabVisibility() {
  return !document.hidden;
}

function getServerTabVisibility() {
  return true;
}

function createEvent(
  tick: number,
  kind: LiveEventKind,
  message: string,
  sequence: number,
): LiveEvent {
  return { id: `live-${tick}-${sequence}`, kind, message, animate: true };
}

function advanceSimulation(previous: LiveSimulationState): LiveSimulationState {
  const tick = (previous.tick + 1) % MAX_TICK;
  const stock = previous.stock.map((item) => ({ ...item }));
  const events: LiveEvent[] = [];
  const ticker = [...previous.ticker];
  const appendEvent = (kind: LiveEventKind, message: string) => {
    events.push(createEvent(tick, kind, message, events.length));
    ticker.unshift(message);
  };
  let sales = previous.sales;
  let orders = previous.orders;
  let scannerActive = tick % 4 === 3;

  if (tick % 12 === 0) {
    const index = Math.floor(tick / 12) % stock.length;
    const item = stock[index];
    item.quantity = Math.min(item.maximum, item.quantity + 10);
    appendEvent("purchase", `Purchase received · ${item.name} · 10 units checked in`);
  } else if (tick % 4 === 0) {
    scannerActive = false;
    const index = Math.floor(tick / 4) % stock.length;
    const item = stock[index];
    const quantity = 1 + (tick % 3);
    item.quantity = Math.max(0, item.quantity - quantity);
    const amount = quantity * item.price;
    sales += amount;
    orders = (orders + 1) % 10000;
    appendEvent(
      "sale",
      `Sale #${1043 + orders} · ${quantity} x ${item.name} · KES ${amount.toLocaleString("en-KE")} · M-Pesa confirmed`,
    );
  }

  stock.forEach((item) => {
    if (item.reorderIn !== null) {
      item.reorderIn -= 1;
      if (item.reorderIn <= 0) {
        item.quantity = item.maximum;
        item.reorderIn = null;
        item.restockedFor = 8;
        appendEvent("restocked", `Restocked · ${item.name} · ${item.maximum} units ready`);
      }
    } else if (item.quantity <= item.threshold) {
      item.reorderIn = 8;
      appendEvent("low", `Low stock alert · ${item.name} · ${item.quantity} left`);
      appendEvent("reorder", `Reorder sent · ${item.name} · supplier notified`);
    }

    if (item.restockedFor > 0) item.restockedFor -= 1;
  });

  const chartValue = Math.max(
    12,
    Math.min(
      100,
      Math.round(54 + Math.sin(tick * 0.35) * 13 + Math.cos(tick * 0.12) * 9 + (tick % 60) * 0.25),
    ),
  );

  return {
    tick,
    sales: sales >= 999_999 ? sales - 900_000 : sales,
    orders,
    stock,
    chart: [...previous.chart.slice(-59), chartValue],
    events: [...events, ...previous.events].slice(0, 7),
    ticker: ticker.slice(0, 12),
    scannerActive,
  };
}

export default function useLiveSimulation(sectionRef: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState(INITIAL_LIVE_STATE);
  const [clock, setClock] = useState("12:00:00");
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const userPausedRef = useRef(false);
  const isTabVisible = useSyncExternalStore(
    subscribeToTabVisibility,
    getTabVisibility,
    getServerTabVisibility,
  );
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
        setIsVisible(visible);
        if (visible && !document.hidden && !prefersReducedMotion && !userPausedRef.current) {
          setIsPlaying(true);
        } else if (!visible || document.hidden || prefersReducedMotion) {
          setIsPlaying(false);
        }
      },
      { threshold: [0, 0.2, 1] },
    );

    observer.observe(section);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
      } else if (isVisible && !prefersReducedMotion && !userPausedRef.current) {
        setIsPlaying(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isVisible, prefersReducedMotion, sectionRef]);

  useEffect(() => {
    if (!isPlaying || !isVisible || !isTabVisible || prefersReducedMotion) return;

    let expectedAt = Date.now() + TICK_MS;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setState(advanceSimulation);
      setClock(new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Nairobi",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date()));
      expectedAt += TICK_MS;
      timeout = setTimeout(tick, Math.max(0, expectedAt - Date.now()));
    };

    timeout = setTimeout(tick, TICK_MS);
    return () => clearTimeout(timeout);
  }, [isPlaying, isVisible, isTabVisible, prefersReducedMotion]);

  const togglePlayback = () => {
    if (prefersReducedMotion) return;
    const nextPlaying = !isPlaying;
    userPausedRef.current = !nextPlaying;
    setIsPlaying(nextPlaying);
  };

  return {
    state,
    clock,
    isVisible,
    isPlaying,
    prefersReducedMotion,
    togglePlayback,
  };
}

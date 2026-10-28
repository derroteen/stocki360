"use client";

import { useEffect, useState } from "react";
import type { LiveEvent } from "./liveData";

const EVENT_STYLES = {
  sale: "bg-accent-100 text-accent-text",
  purchase: "bg-good-100 text-good-700",
  low: "bg-warn-100 text-warn-800",
  reorder: "bg-accent-100 text-accent-text",
  restocked: "bg-good-100 text-good-700",
} as const;

function TypedEvent({
  event,
  reducedMotion,
  active,
}: {
  event: LiveEvent;
  reducedMotion: boolean;
  active: boolean;
}) {
  const [message, setMessage] = useState(event.animate && !reducedMotion ? "" : event.message);

  useEffect(() => {
    if (!event.animate || reducedMotion || !active) return;

    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const typeNext = () => {
      index = Math.min(index + 1, event.message.length);
      setMessage(event.message.slice(0, index));
      if (index < event.message.length) timeout = setTimeout(typeNext, 20);
    };
    timeout = setTimeout(typeNext, 20);

    return () => clearTimeout(timeout);
  }, [active, event, reducedMotion]);

  return (
    <li className={`flex min-w-0 items-start gap-2.5 py-2.5 ${event.animate && !reducedMotion ? "live-event-enter" : ""}`}>
      <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${EVENT_STYLES[event.kind]}`} aria-hidden="true">
        {event.kind === "sale" ? "↗" : event.kind === "low" ? "!" : event.kind === "restocked" ? "✓" : event.kind === "reorder" ? "↻" : "+"}
      </span>
      <span className="min-w-0 flex-1 text-xs leading-5 text-ink-700">
        {reducedMotion ? event.message : message}
      </span>
      <span className="shrink-0 pt-0.5 text-[10px] text-ink-400">now</span>
    </li>
  );
}

export default function ActivityFeed({
  events,
  reducedMotion,
  active,
}: {
  events: LiveEvent[];
  reducedMotion: boolean;
  active: boolean;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-card/70 p-4 sm:p-5" aria-label="Recent activity">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-800">Live activity</h3>
        <span className="text-[10px] font-medium uppercase tracking-wider text-ink-400">Today</span>
      </div>
      <ul className="divide-y divide-line" aria-live="off">
        {events.map((event) => (
          <TypedEvent key={event.id} event={event} reducedMotion={reducedMotion} active={active} />
        ))}
      </ul>
    </section>
  );
}

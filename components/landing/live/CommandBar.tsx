"use client";

import { useEffect, useState } from "react";
import { COMMAND_QUERIES } from "./liveData";

export default function CommandBar({
  reducedMotion,
  active,
}: {
  reducedMotion: boolean;
  active: boolean;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (reducedMotion || !active) return;

    let queryIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const advance = () => {
      const currentQuery = COMMAND_QUERIES[queryIndex];
      characterIndex += deleting ? -1 : 1;
      setQuery(currentQuery.slice(0, characterIndex));

      if (characterIndex === currentQuery.length) {
        deleting = true;
        timeout = setTimeout(advance, 1100);
      } else if (characterIndex === 0) {
        deleting = false;
        queryIndex = (queryIndex + 1) % COMMAND_QUERIES.length;
        timeout = setTimeout(advance, 250);
      } else {
        timeout = setTimeout(advance, deleting ? 38 : 82);
      }
    };

    timeout = setTimeout(advance, 250);
    return () => clearTimeout(timeout);
  }, [active, reducedMotion]);

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-subtle/80 px-3 py-2.5 text-sm shadow-inner sm:px-4">
      <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" strokeLinecap="round" />
      </svg>
      <span className="shrink-0 text-ink-500">Ask Stocki</span>
      <span aria-hidden="true" className="min-w-0 truncate font-medium text-ink-800">
        {reducedMotion ? COMMAND_QUERIES[0] : query}
        {!reducedMotion && <span className="live-command-caret" />}
      </span>
      <span className="sr-only">The command demo types sales, stock, and reorder questions.</span>
    </div>
  );
}

"use client";

export default function LiveTicker({ items, reducedMotion }: { items: string[]; reducedMotion: boolean }) {
  const content = [...items, ...items];
  return (
    <div className="live-ticker-wrap mt-5 overflow-hidden border-t border-line pt-4" aria-hidden="true">
      <div className={`live-ticker-track ${reducedMotion ? "" : "live-ticker-track--moving"}`}>
        {content.map((item, index) => (
          <span key={`${index}-${item}`} className="inline-flex shrink-0 items-center gap-3 px-4 text-[11px] text-ink-500">
            <span className="h-1 w-1 rounded-full bg-accent-500" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

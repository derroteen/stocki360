import type { ReactNode } from 'react';

export default function SceneChrome({
  children,
  active,
}: {
  children: ReactNode;
  active: boolean;
}) {
  return (
    <div
      className="walkthrough-window relative h-full overflow-hidden rounded-xl border border-line bg-card shadow-sm"
      data-playing={active}
    >
      <div className="flex h-8 items-center gap-2 border-b border-line bg-subtle px-3">
        <span className="h-2 w-2 rounded-full bg-danger-500" />
        <span className="h-2 w-2 rounded-full bg-warn-500" />
        <span className="h-2 w-2 rounded-full bg-good-600" />
        <div className="ml-2 min-w-0 flex-1 truncate rounded-md border border-line bg-card px-2 py-0.5 text-center text-[10px] text-ink-500 sm:text-xs">
          app.stocki360.com
        </div>
      </div>
      {children}
    </div>
  );
}

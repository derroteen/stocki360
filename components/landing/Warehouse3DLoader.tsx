"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

function WarehousePlaceholder() {
  return (
    <section className="border-b border-line bg-surface py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-link">A closer look</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-ink-900 sm:text-4xl">Your stock, in 3D</h2>
          <p className="mt-2 text-sm text-ink-600 sm:text-base">Follow every product from arrival to reorder.</p>
        </div>
        <div
          className="mx-auto aspect-video max-w-5xl rounded-2xl border border-line bg-card p-2 shadow-lg sm:p-4"
          aria-hidden="true"
        >
          <div className="h-full rounded-xl border border-line bg-subtle" />
        </div>
      </div>
    </section>
  );
}

export default function Warehouse3DLoader() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [WarehouseBoundary, setWarehouseBoundary] = useState<ComponentType | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: [0, 0.3, 1] });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || WarehouseBoundary) return;
    let active = true;
    import("./Warehouse3DBoundary")
      .then(({ default: Boundary }) => {
        if (active) setWarehouseBoundary(() => Boundary);
      })
      .catch((error: unknown) => {
        console.error("Unable to load the 3D warehouse experience:", error);
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [isVisible, WarehouseBoundary]);

  return (
    <div ref={sectionRef}>
      {isVisible && WarehouseBoundary ? (
        <WarehouseBoundary />
      ) : (
        <>
          <WarehousePlaceholder />
          {loadFailed && (
            <p className="sr-only" role="alert">
              The 3D warehouse could not be loaded. Please try again later.
            </p>
          )}
        </>
      )}
    </div>
  );
}

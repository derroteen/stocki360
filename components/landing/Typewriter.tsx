'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const HEADLINE = 'Run your stock with clarity, from shelf to sale.';

function subscribeToMotionPreference(onChange: () => void) {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', onChange);

  return () => mediaQuery.removeEventListener('change', onChange);
}

function getMotionPreference() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getServerMotionPreference() {
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    getServerMotionPreference
  );
}

export default function Typewriter({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [typedText, setTypedText] = useState('');
  const isComplete = prefersReducedMotion || typedText.length === HEADLINE.length;

  useEffect(() => {
    if (prefersReducedMotion || typedText.length === HEADLINE.length) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    let nextIndex = typedText.length;

    const typeNextCharacter = () => {
      nextIndex += 1;
      setTypedText(HEADLINE.slice(0, nextIndex));

      if (nextIndex < HEADLINE.length) {
        timeout = setTimeout(typeNextCharacter, 45 + Math.random() * 18 - 9);
      }
    };

    timeout = setTimeout(typeNextCharacter, 45);

    return () => clearTimeout(timeout);
  }, [prefersReducedMotion, typedText.length]);

  return (
    <div
      className="landing-hero-copy space-y-6"
      data-complete={isComplete}
      data-reduced-motion={prefersReducedMotion}
    >
      <h1
        aria-label={HEADLINE}
        className="landing-typewriter font-serif text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl"
      >
        <span aria-hidden="true" className="landing-typewriter__full">
          {HEADLINE}
        </span>
        <span aria-hidden="true" className="landing-typewriter__typed">
          {prefersReducedMotion ? HEADLINE : typedText}
          {!prefersReducedMotion && !isComplete ? (
            <span className="landing-typewriter__caret" />
          ) : null}
        </span>
        <noscript>
          <style>{`
            .landing-typewriter__full { visibility: visible !important; }
            .landing-typewriter__typed { display: none !important; }
            .landing-hero-copy .landing-paragraph,
            .landing-hero-copy .landing-feature,
            .landing-hero-copy .landing-actions {
              opacity: 1 !important;
              transform: none !important;
              transition: none !important;
            }
          `}</style>
        </noscript>
      </h1>
      <div className="landing-hero-supporting">{children}</div>
    </div>
  );
}

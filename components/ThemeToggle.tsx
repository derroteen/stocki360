'use client';

import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'stocki-theme';
const THEME_CHANGE_EVENT = 'stocki-theme-change';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('Unable to save theme preference:', error);
  }

  window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: theme }));
}

function subscribeToTheme(onThemeChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }

    const theme =
      event.newValue === 'light' || event.newValue === 'dark'
        ? event.newValue
        : getSystemTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    onThemeChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener('storage', handleStorage);
  };
}

function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getServerTheme(): Theme {
  return 'light';
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeToTheme, getCurrentTheme, getServerTheme);
}

export default function ThemeToggle() {
  const theme = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-line bg-card text-ink-700 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      {theme === 'dark' ? (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.463.402.807a6.5 6.5 0 0 0 8.268 8.268c.344-.215.829-.003.803.397Z"
          />
        </svg>
      )}
    </button>
  );
}

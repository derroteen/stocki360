'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

let wasInstalled = false;

function getStandaloneMediaQuery() {
  return window.matchMedia('(display-mode: standalone)');
}

function subscribeToInstalled(onStoreChange: () => void) {
  const mediaQuery = getStandaloneMediaQuery();
  const handleAppInstalled = () => {
    wasInstalled = true;
    onStoreChange();
  };

  mediaQuery.addEventListener('change', onStoreChange);
  window.addEventListener('appinstalled', handleAppInstalled);

  return () => {
    mediaQuery.removeEventListener('change', onStoreChange);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}

function getIsInstalled(): boolean {
  return wasInstalled || isStandalone();
}

function subscribeToOfflineStatus(onStoreChange: () => void) {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);

  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

function getIsOffline(): boolean {
  return !navigator.onLine;
}

function subscribeToIosHelp(onStoreChange: () => void) {
  const mediaQuery = getStandaloneMediaQuery();
  mediaQuery.addEventListener('change', onStoreChange);
  window.addEventListener('appinstalled', onStoreChange);

  return () => {
    mediaQuery.removeEventListener('change', onStoreChange);
    window.removeEventListener('appinstalled', onStoreChange);
  };
}

function getShowIosHelp(): boolean {
  return isIos() && !isStandalone();
}

export default function PwaRuntime() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isInstalled = useSyncExternalStore(subscribeToInstalled, getIsInstalled, () => false);
  const isOffline = useSyncExternalStore(subscribeToOfflineStatus, getIsOffline, () => false);
  const showIosHelp = useSyncExternalStore(subscribeToIosHelp, getShowIosHelp, () => false);

  useEffect(() => {
    // The worker is network-only because Stocki360 must never cache private inventory data.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installation remains optional if a browser or deployment blocks service workers.
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <>
      {isOffline ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-warn-600/30 bg-warn-100 px-4 py-2 text-center text-xs font-medium text-warn-700">
          You&apos;re offline. Reconnect to continue using live inventory data.
        </div>
      ) : null}

      {!isInstalled && installPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          className="fixed bottom-4 right-4 z-50 min-h-[44px] rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-accent-700"
        >
          Install Stocki360
        </button>
      ) : null}

      {!isInstalled && !installPrompt && showIosHelp ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-line bg-card px-4 py-3 text-xs text-ink-700 shadow-lg">
          Install Stocki360 from Safari&apos;s Share menu with &quot;Add to Home Screen&quot;.
        </div>
      ) : null}
    </>
  );
}

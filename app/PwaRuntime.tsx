'use client';

import { useEffect, useState } from 'react';

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

export default function PwaRuntime() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    // The worker is network-only because Stocki360 must never cache private inventory data.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installation remains optional if a browser or deployment blocks service workers.
      });
    }

    setIsInstalled(isStandalone());
    setIsOffline(!navigator.onLine);
    setShowIosHelp(isIos() && !isStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-ink-700 shadow-lg">
          Install Stocki360 from Safari&apos;s Share menu with &quot;Add to Home Screen&quot;.
        </div>
      ) : null}
    </>
  );
}

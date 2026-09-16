'use client';

import { useEffect, useRef, useState } from 'react';

export type ScanResult =
  | { status: 'added'; productName: string; quantity: number }
  | { status: 'incremented'; productName: string; quantity: number }
  | { status: 'not_found' }
  | { status: 'stock_limit'; productName: string; available: number };

interface CameraScannerProps {
  onScan: (barcode: string) => ScanResult;
  onClose: () => void;
  /** Current total quantity across all lines in the sale, for the running tally. */
  totalQuantity: number;
}

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorLike;
}

type ScannerStatus = 'requesting' | 'active' | 'unsupported' | 'permission-denied';

interface Banner {
  tone: 'good' | 'warn';
  text: string;
}

const SCAN_DEBOUNCE_MS = 2000;
const BANNER_DURATION_MS = 1500;

export default function CameraScanner({ onScan, onClose, totalQuantity }: CameraScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>('requesting');
  const [banner, setBanner] = useState<Banner | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);

  // Keep the latest onScan without making the camera-setup effect below
  // depend on it — restarting the stream on every parent re-render would
  // flicker the camera.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const showBanner = (result: ScanResult) => {
    let next: Banner;
    let vibrationPattern: number | number[];

    switch (result.status) {
      case 'added':
      case 'incremented':
        next = { tone: 'good', text: `${result.productName} — qty ${result.quantity}` };
        vibrationPattern = 100;
        break;
      case 'not_found':
        next = { tone: 'warn', text: 'No product matches that barcode' };
        vibrationPattern = [60, 60, 60];
        break;
      case 'stock_limit':
        next = { tone: 'warn', text: `${result.productName} — only ${result.available} left` };
        vibrationPattern = [60, 60, 60];
        break;
    }

    if (navigator.vibrate) {
      navigator.vibrate(vibrationPattern);
    }

    setBanner(next);
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = setTimeout(() => setBanner(null), BANNER_DURATION_MS);
  };

  useEffect(() => {
    let cancelled = false;

    const BarcodeDetectorCtor = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      setStatus('unsupported');
      return;
    }

    const detector = new BarcodeDetectorCtor({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStatus('active');

        const tick = async () => {
          if (cancelled || !videoRef.current) return;

          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) {
              const value = results[0].rawValue;
              const now = Date.now();
              const last = lastScanRef.current;

              // Ignore the same barcode re-firing while it's still in frame.
              if (!last || last.value !== value || now - last.time > SCAN_DEBOUNCE_MS) {
                lastScanRef.current = { value, time: now };
                const result = onScanRef.current(value);
                showBanner(result);
              }
            }
          } catch {
            // Transient detection errors (e.g. video not ready yet) — keep looping.
          }

          if (!cancelled) {
            rafRef.current = requestAnimationFrame(tick);
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('permission-denied');
        }
      });

    return () => {
      cancelled = true;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = null;
      }

      // Stop every track so the camera indicator light actually turns off.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col" role="dialog" aria-modal="true">
      <div className="flex-1 relative overflow-hidden">
        {status === 'unsupported' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
            <p className="text-white text-sm max-w-xs">
              Camera scanning isn&apos;t supported in this browser. Try Chrome on Android, or use a USB scanner.
            </p>
          </div>
        )}

        {status === 'permission-denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
            <p className="text-white text-sm max-w-xs">
              Camera permission is needed to scan. You can still type the barcode manually.
            </p>
          </div>
        )}

        {(status === 'requesting' || status === 'active') && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Framing guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[75%] max-w-md aspect-[3/2] border-4 border-white/80 rounded-xl" />
            </div>

            {/* Running tally — the main signal that scans are landing */}
            <div className="absolute top-4 left-0 right-0 flex items-center justify-center px-4 pointer-events-none">
              <p className="text-white text-sm font-semibold bg-black/50 px-4 py-2 rounded-full">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} in this sale
              </p>
            </div>

            {banner && (
              <div className="absolute top-16 left-4 right-4 flex justify-center pointer-events-none">
                <div
                  className={`max-w-sm w-full rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg text-white ${
                    banner.tone === 'good' ? 'bg-good-600' : 'bg-warn-500'
                  }`}
                >
                  {banner.tone === 'good' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 shrink-0"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  )}
                  <span className="text-sm font-semibold">{banner.text}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 p-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[56px] bg-accent-500 hover:bg-accent-600 text-white text-base font-semibold rounded-xl shadow-lg transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}

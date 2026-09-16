'use client';

import { useEffect, useRef, useState } from 'react';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
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

const SCAN_DEBOUNCE_MS = 2000;

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>('requesting');
  const [showFlash, setShowFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);

  // Keep the latest onScan without making the camera-setup effect below
  // depend on it — restarting the stream on every parent re-render would
  // flicker the camera.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const triggerFlash = () => {
    setShowFlash(true);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = setTimeout(() => setShowFlash(false), 400);
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
                onScanRef.current(value);
                if (navigator.vibrate) {
                  navigator.vibrate(100);
                }
                triggerFlash();
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

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
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
      {status === 'unsupported' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <p className="text-white text-sm max-w-xs">
            Camera scanning isn&apos;t supported in this browser. Try Chrome on Android, or use a USB scanner.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-sm font-medium text-ink-900 bg-white rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {status === 'permission-denied' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <p className="text-white text-sm max-w-xs">
            Camera permission is needed to scan. You can still type the barcode manually.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-sm font-medium text-ink-900 bg-white rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
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

          <div className="absolute top-4 left-0 right-0 flex items-center justify-center px-4 pointer-events-none">
            <p className="text-white text-xs bg-black/40 px-3 py-1.5 rounded-full">
              Point the camera at a barcode
            </p>
          </div>

          {showFlash && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/20 pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-good-500/90 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-10 h-10 text-white"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close scanner"
        className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors cursor-pointer z-10"
      >
        ✕
      </button>
    </div>
  );
}

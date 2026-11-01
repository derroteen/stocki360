'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Sale } from '@/lib/supabase/types';
import Receipt from './Receipt';

type PaperWidth = '58mm' | '80mm' | 'A4';

interface ReceiptModalProps {
  sale: Sale;
  businessName: string;
  onClose: () => void;
}

const PAPER_STORAGE_KEY = 'stocki360-receipt-paper-width';

function getReceiptReference(sale: Sale) {
  return sale.id.slice(-8).toUpperCase();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const international = digits.startsWith('0') ? `254${digits.slice(1)}` : digits;
  return /^254[17]\d{8}$/.test(international) ? international : null;
}

export default function ReceiptModal({ sale, businessName, onClose }: ReceiptModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLElement | null>(null);
  const [paperWidth, setPaperWidth] = useState<PaperWidth>('80mm');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    try {
      const savedWidth = window.localStorage.getItem(PAPER_STORAGE_KEY);
      if (savedWidth === '58mm' || savedWidth === '80mm' || savedWidth === 'A4') {
        timer = window.setTimeout(() => setPaperWidth(savedWidth), 0);
      }
    } catch {
      // Storage may be unavailable in private browsing; keep the default width.
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const firstButton = dialog?.querySelector<HTMLButtonElement>('[data-initial-focus]');
    firstButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.body.classList.remove('receipt-printing');
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const handleAfterPrint = () => document.body.classList.remove('receipt-printing');
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePaperWidthChange = (value: string) => {
    if (value !== '58mm' && value !== '80mm' && value !== 'A4') return;

    setPaperWidth(value);
    try {
      window.localStorage.setItem(PAPER_STORAGE_KEY, value);
    } catch {
      // Keep the in-memory selection when storage is unavailable.
    }
  };

  const handlePrint = () => {
    setErrorMessage(null);
    try {
      document.body.classList.add('receipt-printing');
      window.print();
    } catch (error) {
      document.body.classList.remove('receipt-printing');
      console.error('Unable to print receipt:', error);
      setErrorMessage('Unable to open the print dialog. Please try again.');
    }
  };

  const createPng = useCallback(async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const node = receiptRef.current;
      if (!node) throw new Error('Receipt preview is unavailable.');

      const exportNode = node.cloneNode(true) as HTMLElement;
      exportNode.classList.add('receipt-document--plain');
      exportNode.style.position = 'fixed';
      exportNode.style.left = '-10000px';
      exportNode.style.top = '0';
      exportNode.style.width = paperWidth === 'A4' ? '210mm' : paperWidth;
      exportNode.style.backgroundColor = '#fff';
      exportNode.style.color = '#000';
      exportNode.style.border = '0';
      exportNode.style.boxShadow = 'none';
      document.body.appendChild(exportNode);

      try {
        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(exportNode, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        });
        if (!blob) throw new Error('Receipt image could not be created.');
        return blob;
      } finally {
        exportNode.remove();
      }
    } catch (error) {
      console.error('Unable to create receipt image:', error);
      setErrorMessage('Unable to create the receipt image. Please try printing or sharing again.');
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [paperWidth]);

  const handleShareImage = async () => {
    const blob = await createPng();
    if (!blob) return;

    try {
      const file = new File([blob], `receipt-${getReceiptReference(sale)}.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Sales receipt ${getReceiptReference(sale)}`,
        });
        setStatusMessage('Receipt shared.');
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = file.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setStatusMessage('Receipt image downloaded.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatusMessage('Sharing was cancelled.');
        return;
      }

      console.error('Unable to share receipt image:', error);
      setErrorMessage('Unable to share or download the receipt image. Please try again.');
    }
  };

  const handleWhatsApp = () => {
    const items = (sale.sale_items ?? []).map((item) => {
      const name = (item.product?.name || 'Product').replace(/\s+/g, ' ').trim();
      return `${name} / ${Math.abs(item.quantity)} x ${formatCurrency(item.unit_price)} / ${formatCurrency(item.line_total)}`;
    });
    const message = [
      businessName,
      'SALES RECEIPT',
      `Receipt ref: #${getReceiptReference(sale)}`,
      ...items,
      `Total: ${formatCurrency(sale.total_amount)}`,
    ].join('\n');
    const phone = sale.customer_phone ? normalizeKenyanPhone(sale.customer_phone) : null;
    const query = new URLSearchParams({ text: message }).toString();
    const url = phone ? `https://wa.me/${phone}?${query}` : `https://wa.me/?${query}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="receipt-print-root fixed inset-0 z-[70] flex items-center justify-center bg-overlay/40 p-3 backdrop-blur-xs sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close receipt preview"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        tabIndex={-1}
        data-receipt-paper={paperWidth}
        className="receipt-modal-shell relative flex max-h-[92dvh] w-full max-w-xl min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-xl"
      >
        <div className="receipt-modal-controls flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="receipt-modal-title" className="text-lg font-bold text-ink-900">
              Receipt preview
            </h2>
            <p className="text-xs text-ink-500">Choose a paper size before printing.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-ink-600 hover:bg-subtle"
            aria-label="Close receipt preview"
            data-initial-focus
          >
            ✕
          </button>
        </div>

        <div className="receipt-modal-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <label className="mb-3 flex min-h-[44px] items-center justify-between gap-3 text-sm text-ink-700">
            <span className="font-medium">Paper width</span>
            <select
              value={paperWidth}
              onChange={(event) => handlePaperWidthChange(event.target.value)}
              className="min-h-[44px] max-w-[55%] rounded-lg border border-line-strong bg-card px-3 text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label="Paper width"
            >
              <option value="58mm">58mm thermal</option>
              <option value="80mm">80mm thermal</option>
              <option value="A4">A4</option>
            </select>
          </label>
          <div
            className="receipt-print-content mx-auto w-full max-w-full sm:max-w-[80mm]"
            style={{
              width: paperWidth === 'A4' ? '100%' : `min(100%, ${paperWidth})`,
            }}
          >
            <Receipt ref={receiptRef} businessName={businessName} sale={sale} />
          </div>
        </div>

        <div className="receipt-modal-controls border-t border-line bg-subtle px-3 py-3 sm:px-5">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] rounded-lg bg-accent-600 px-3 text-xs font-semibold text-white hover:bg-accent-700 sm:text-sm"
              aria-label="Print receipt or save as PDF"
            >
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={handleShareImage}
              disabled={isExporting}
              className="min-h-[44px] rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-700 hover:bg-subtle-strong disabled:opacity-60 sm:text-sm"
              aria-label="Share receipt as an image"
            >
              {isExporting ? 'Creating image…' : 'Share image'}
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="min-h-[44px] rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-700 hover:bg-subtle-strong sm:text-sm"
              aria-label="Send receipt summary with WhatsApp"
            >
              WhatsApp text
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-700 hover:bg-subtle-strong sm:text-sm"
            >
              Close
            </button>
          </div>
          {errorMessage && (
            <p className="mt-2 text-sm text-danger-700" role="alert">{errorMessage}</p>
          )}
          {statusMessage && (
            <p className="mt-2 text-sm text-ink-600" role="status">{statusMessage}</p>
          )}
        </div>

      </div>
    </div>
  );
}

'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Sale } from '@/lib/supabase/types';
import Receipt from './Receipt';

type PaperWidth = '58mm' | '80mm' | 'A4';

interface ReceiptModalProps {
  sale: Sale;
  businessName: string | null;
  onClose: () => void;
}

interface RenderedReceipt {
  blob: Blob;
  dataUrl: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  itemBoundariesPx: number[];
}

const PAPER_STORAGE_KEY = 'stocki360-receipt-paper-width';
const PRINT_ROOT_ID = 'receipt-print-root';

let receiptPrintRoot: HTMLDivElement | null = null;
const printRootSubscribers = new Set<() => void>();

function subscribeToPrintRoot(onChange: () => void) {
  printRootSubscribers.add(onChange);

  if (!receiptPrintRoot) {
    const existing = document.getElementById(PRINT_ROOT_ID);
    if (existing instanceof HTMLDivElement) {
      receiptPrintRoot = existing;
    } else {
      receiptPrintRoot = document.createElement('div');
      receiptPrintRoot.id = PRINT_ROOT_ID;
      receiptPrintRoot.className = 'receipt-print-root';
      receiptPrintRoot.setAttribute('aria-hidden', 'true');
      document.body.appendChild(receiptPrintRoot);
    }
  }

  onChange();

  return () => {
    printRootSubscribers.delete(onChange);
    if (printRootSubscribers.size === 0 && receiptPrintRoot) {
      receiptPrintRoot.remove();
      receiptPrintRoot = null;
    }
  };
}

function getPrintRootSnapshot() {
  return receiptPrintRoot;
}

function getServerPrintRootSnapshot() {
  return null;
}

function getReceiptReference(sale: Sale) {
  return sale.id.slice(-8).toUpperCase();
}

function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const international = digits.startsWith('0') ? `254${digits.slice(1)}` : digits;
  return /^254[17]\d{8}$/.test(international) ? international : null;
}

function downloadBlob(blob: Blob, fileName: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/[\u00a0\u202f]/g, '\u00a0');
}

export default function ReceiptModal({ sale, businessName, onClose }: ReceiptModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLElement | null>(null);
  const printRoot = useSyncExternalStore(
    subscribeToPrintRoot,
    getPrintRootSnapshot,
    getServerPrintRootSnapshot
  );
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
    } catch (error) {
      console.warn('Unable to read the saved receipt paper width.', error);
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !businessName?.trim()) {
      console.warn('Receipt business name is unavailable; omitting it from the receipt.');
    }
  }, [businessName]);

  useEffect(() => {
    const root = document.getElementById(PRINT_ROOT_ID);
    if (root) root.dataset.paper = paperWidth;
  }, [paperWidth]);

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
      previousFocus?.focus();
    };
  }, [onClose]);

  const handlePaperWidthChange = (value: string) => {
    if (value !== '58mm' && value !== '80mm' && value !== 'A4') return;

    setPaperWidth(value);
    try {
      window.localStorage.setItem(PAPER_STORAGE_KEY, value);
    } catch (error) {
      console.warn('Unable to save the receipt paper width.', error);
    }
  };

  const renderReceiptPng = async (): Promise<RenderedReceipt> => {
    const source = receiptRef.current;
    if (!source) throw new Error('Printable receipt is unavailable.');

    const widthMm = paperWidth === '58mm' ? 58 : paperWidth === '80mm' ? 80 : 110;
    const exportHost = document.createElement('div');
    exportHost.className = 'receipt-export-host';
    exportHost.dataset.paper = paperWidth;
    exportHost.style.position = 'fixed';
    exportHost.style.left = '-10000px';
    exportHost.style.top = '0';
    exportHost.style.width = `${widthMm}mm`;
    exportHost.style.backgroundColor = '#fff';
    exportHost.style.color = '#000';

    const exportNode = source.cloneNode(true) as HTMLElement;
    exportNode.classList.add('receipt-document--plain');
    exportNode.style.width = '100%';
    exportNode.style.maxWidth = 'none';
    exportNode.style.boxSizing = 'border-box';
    exportNode.style.margin = '0';
    exportNode.style.fontFamily = 'Arial, Helvetica, sans-serif';
    exportHost.appendChild(exportNode);
    document.body.appendChild(exportHost);

    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const heightMm = (exportNode.getBoundingClientRect().height * 25.4) / 96;
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(exportNode, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        cacheBust: true,
      });
      const blob = await fetch(dataUrl).then((response) => response.blob());
      const bounds = exportNode.getBoundingClientRect();
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const pixelScale = image.naturalWidth / bounds.width;
      const itemBoundariesPx = Array.from(
        exportNode.querySelectorAll<HTMLElement>('.receipt-item')
      ).map((item) => {
        const itemBounds = item.getBoundingClientRect();
        return Math.round((itemBounds.bottom - bounds.top) * pixelScale);
      });

      return {
        blob,
        dataUrl,
        widthMm,
        heightMm,
        widthPx: image.naturalWidth,
        heightPx: image.naturalHeight,
        itemBoundariesPx,
      };
    } finally {
      exportHost.remove();
    }
  };

  const handlePrint = () => {
    setErrorMessage(null);
    try {
      window.print();
    } catch (error) {
      console.error('Unable to print receipt:', error);
      setErrorMessage('Unable to open the print dialog. Please try again.');
    }
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const image = await renderReceiptPng();
      const { jsPDF } = await import('jspdf');

      if (paperWidth === 'A4') {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const maxPageHeightPx = Math.floor((273 / image.widthMm) * image.widthPx);
        const pages: Array<{ start: number; end: number }> = [];
        let start = 0;

        while (start < image.heightPx) {
          const target = Math.min(start + maxPageHeightPx, image.heightPx);
          const lastBoundary = image.itemBoundariesPx
            .filter((boundary) => boundary > start && boundary <= target)
            .at(-1);
          const end = target === image.heightPx ? target : lastBoundary ?? target;
          pages.push({ start, end });
          start = end;
        }

        for (const [index, page] of pages.entries()) {
          if (index > 0) pdf.addPage('a4', 'portrait');
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = image.widthPx;
          pageCanvas.height = page.end - page.start;
          const context = pageCanvas.getContext('2d');
          if (!context) throw new Error('Unable to prepare a page of the receipt PDF.');

          const pageImage = new Image();
          pageImage.src = image.dataUrl;
          await pageImage.decode();
          context.drawImage(
            pageImage,
            0,
            page.start,
            image.widthPx,
            pageCanvas.height,
            0,
            0,
            pageCanvas.width,
            pageCanvas.height
          );
          const pageData = pageCanvas.toDataURL('image/png');
          const pageHeightMm = (pageCanvas.height / image.widthPx) * image.widthMm;
          const x = (210 - image.widthMm) / 2;
          const y = pageHeightMm < 273 ? Math.max(12, (297 - pageHeightMm) / 2) : 12;
          pdf.addImage(pageData, 'PNG', x, y, image.widthMm, pageHeightMm);
        }
        pdf.save(`receipt-${getReceiptReference(sale)}.pdf`);
      } else {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [image.widthMm, image.heightMm],
        });
        pdf.addImage(image.dataUrl, 'PNG', 0, 0, image.widthMm, image.heightMm);
        pdf.save(`receipt-${getReceiptReference(sale)}.pdf`);
      }
      setStatusMessage('Receipt PDF downloaded.');
    } catch (error) {
      console.error('Unable to download receipt PDF:', error);
      setErrorMessage('Unable to create the receipt PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareImage = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const image = await renderReceiptPng();
      const file = new File([image.blob], `receipt-${getReceiptReference(sale)}.png`, {
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

      downloadBlob(image.blob, file.name);
      setStatusMessage('Receipt image downloaded.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatusMessage('Sharing was cancelled.');
        return;
      }

      console.error('Unable to share receipt image:', error);
      setErrorMessage('Unable to share or download the receipt image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const image = await renderReceiptPng();
      downloadBlob(image.blob, `receipt-${getReceiptReference(sale)}.png`);
      setStatusMessage('Receipt image downloaded.');
    } catch (error) {
      console.error('Unable to download receipt image:', error);
      setErrorMessage('Unable to download the receipt image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsApp = () => {
    const items = (sale.sale_items ?? []).map((item) => {
      const name = (item.product?.name || 'Product').replace(/\s+/g, ' ').trim();
      return `${name} / ${Math.abs(item.quantity)} x ${formatCurrency(item.unit_price)} / ${formatCurrency(item.line_total)}`;
    });
    const message = [
      ...(businessName?.trim() ? [businessName.trim()] : []),
      ...items,
      `Total: ${formatCurrency(sale.total_amount)}`,
    ].join('\n');
    const phone = sale.customer_phone ? normalizeKenyanPhone(sale.customer_phone) : null;
    const query = new URLSearchParams({ text: message }).toString();
    const url = phone ? `https://wa.me/${phone}?${query}` : `https://wa.me/?${query}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="receipt-modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-overlay/40 p-3 backdrop-blur-xs sm:p-6">
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
          className="relative flex max-h-[92dvh] w-full max-w-xl min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 id="receipt-modal-title" className="text-lg font-bold text-ink-900">
                Receipt preview
              </h2>
              <p className="text-xs text-ink-500">
                Phone print dialogs may ignore roll-paper sizes; Download PDF is the reliable option on phones.
              </p>
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

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
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
                <option value="A4">A4 / full page</option>
              </select>
            </label>
            <div
              className="mx-auto w-full"
              style={{
                width: `min(100%, ${paperWidth === 'A4' ? 110 : Number.parseInt(paperWidth, 10)}mm)`,
              }}
            >
              <Receipt businessName={businessName} sale={sale} />
            </div>
          </div>

          <div className="border-t border-line bg-subtle px-3 py-3 sm:px-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={handlePrint}
                className="min-h-[44px] rounded-lg bg-accent-600 px-3 text-xs font-semibold text-white hover:bg-accent-700 sm:text-sm"
                aria-label="Print receipt"
              >
                Print
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="min-h-[44px] rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-700 hover:bg-subtle-strong disabled:opacity-60 sm:text-sm"
                aria-label="Download receipt as PDF"
              >
                {isExporting ? 'Preparing…' : 'Download PDF'}
              </button>
              <button
                type="button"
                onClick={handleShareImage}
                disabled={isExporting}
                className="min-h-[44px] rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-700 hover:bg-subtle-strong disabled:opacity-60 sm:text-sm"
                aria-label="Share receipt as an image"
              >
                Share image
              </button>
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="min-h-[44px] rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-700 hover:bg-subtle-strong disabled:opacity-60 sm:text-sm"
                aria-label="Download receipt as an image"
              >
                Download image
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
      {printRoot &&
        createPortal(
          <Receipt ref={receiptRef} businessName={businessName} sale={sale} plain />,
          printRoot
        )}
    </>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { ProductStockLevel, ProductBarcode, CreateSaleItemPayload } from '@/lib/supabase/types';
import CameraScanner, { ScanResult } from './CameraScanner';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductStockLevel[];
  barcodes: ProductBarcode[];
  onSuccess: () => void;
}

interface FormItem {
  productId: string;
  entryMode: 'individual' | 'package';
  quantity: string;
  unitPrice: string;
  packageQuantity: string;
  packageUnitPrice: string;
}

const emptyItem = (): FormItem => ({
  productId: '',
  entryMode: 'individual',
  quantity: '1',
  unitPrice: '',
  packageQuantity: '1',
  packageUnitPrice: '',
});

const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Card', 'Other'];

export default function NewSaleModal({
  isOpen,
  onClose,
  products,
  barcodes,
  onSuccess,
}: NewSaleModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMessage, setBarcodeMessage] = useState<string | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCustomerName('');
      setCustomerPhone('');
      setReferenceNumber('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Cash');
      setNotes('');
      setIdempotencyKey(crypto.randomUUID());
      setItems([emptyItem()]);
      setBarcodeInput('');
      setBarcodeMessage(null);
      setShowCameraScanner(false);

      // Only autofocus on devices with a precise pointer (i.e. a mouse/USB
      // scanner) — on touch devices this pops the on-screen keyboard and
      // buries half the form the moment the modal opens.
      const isFinePointer =
        typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
      if (isFinePointer) {
        barcodeInputRef.current?.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getProduct = (productId: string) => products.find((p) => p.id === productId) || null;

  const productHasPackaging = (productId: string) => {
    const prod = getProduct(productId);
    return Boolean(prod?.package_unit && prod?.units_per_package);
  };

  // Max sellable quantity in the CURRENT entry mode's units, so the input
  // itself won't let a user type more than is in stock. current_stock is
  // always in base stock units regardless of how it was received.
  const maxSellable = (productId: string, mode: 'individual' | 'package') => {
    const prod = getProduct(productId);
    if (!prod) return 0;
    const stock = prod.current_stock ?? 0;
    if (mode === 'package' && prod.units_per_package) {
      return Math.floor(stock / prod.units_per_package);
    }
    return stock;
  };

  // Computes the price that should be prefilled for a product in a given
  // sell mode — shared by product selection and sell-mode switching so the
  // two can't drift apart. Package price prefers package_sell_price,
  // falling back to sell_price x units_per_package when that isn't set.
  const getPrefillPrices = (
    product: ProductStockLevel | null,
    mode: 'individual' | 'package'
  ): { unitPrice: string; packageUnitPrice: string } => {
    if (mode === 'package') {
      const packagePrice =
        product?.package_sell_price != null
          ? product.package_sell_price
          : product?.sell_price != null && product?.units_per_package
          ? product.sell_price * product.units_per_package
          : null;
      return {
        unitPrice: '',
        packageUnitPrice: packagePrice != null ? String(packagePrice) : '',
      };
    }

    return {
      unitPrice: product?.sell_price != null ? String(product.sell_price) : '',
      packageUnitPrice: '',
    };
  };

  const handleBarcodeInputChange = (val: string) => {
    setBarcodeInput(val);
    if (barcodeMessage) setBarcodeMessage(null);
  };

  // Shared by the barcode text input (on Enter) and the camera scanner, so
  // the lookup/increment/add logic can't drift between the two entry paths.
  // Returns what happened so each caller can give its own feedback. Does
  // NOT touch barcodeInput or focus — the camera path must never refocus a
  // text input, or the on-screen keyboard pops up after every scan.
  const handleBarcodeScan = (rawValue: string): ScanResult => {
    const raw = rawValue.trim();

    const matchRow = barcodes.find(
      (b) => b.barcode.trim().toLowerCase() === raw.toLowerCase()
    );
    const match = matchRow ? getProduct(matchRow.product_id) : null;

    if (!matchRow || !match) {
      setBarcodeMessage('No product matches that barcode');
      return { status: 'not_found' };
    }

    const existingIndex = items.findIndex((it) => it.productId === match.id);

    if (existingIndex !== -1) {
      const existing = items[existingIndex];
      const mode = existing.entryMode;
      const currentQty =
        mode === 'package'
          ? parseInt(existing.packageQuantity, 10) || 0
          : parseInt(existing.quantity, 10) || 0;
      const max = maxSellable(match.id, mode);

      if (currentQty + 1 > max) {
        setError(
          mode === 'package'
            ? `Item #${existingIndex + 1}: Only ${max} package(s) available in stock.`
            : `Item #${existingIndex + 1}: Only ${max} available in stock.`
        );
        return { status: 'stock_limit', productName: match.name, available: max };
      }

      setError(null);
      setItems((prev) => {
        const updated = [...prev];
        const it = updated[existingIndex];
        updated[existingIndex] =
          mode === 'package'
            ? { ...it, packageQuantity: String(currentQty + 1) }
            : { ...it, quantity: String(currentQty + 1) };
        return updated;
      });
      return { status: 'incremented', productName: match.name, quantity: currentQty + 1 };
    }

    setError(null);
    setItems((prev) => {
      const newItem: FormItem =
        matchRow.entry_mode === 'package'
          ? {
              productId: match.id,
              entryMode: 'package',
              quantity: '1',
              unitPrice: '',
              packageQuantity: '1',
              packageUnitPrice:
                match.package_sell_price != null
                  ? String(match.package_sell_price)
                  : match.sell_price != null && match.units_per_package
                  ? String(match.sell_price * match.units_per_package)
                  : '',
            }
          : {
              productId: match.id,
              entryMode: 'individual',
              quantity: '1',
              unitPrice: match.sell_price != null ? String(match.sell_price) : '',
              packageQuantity: '1',
              packageUnitPrice: '',
            };
      const emptyIndex = prev.findIndex((it) => it.productId === '');
      if (emptyIndex !== -1) {
        const updated = [...prev];
        updated[emptyIndex] = newItem;
        return updated;
      }
      return [...prev, newItem];
    });
    return { status: 'added', productName: match.name, quantity: 1 };
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeScan(barcodeInput);
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const selectedProd = getProduct(newProductId);
    const prefill = getPrefillPrices(selectedProd, 'individual');
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: newProductId,
        entryMode: 'individual',
        packageQuantity: '1',
        packageUnitPrice: '',
        unitPrice: updated[index].unitPrice || prefill.unitPrice,
      };
      return updated;
    });
  };

  const handleEntryModeChange = (index: number, mode: 'individual' | 'package') => {
    setItems((prev) => {
      const updated = [...prev];
      const prefill = getPrefillPrices(getProduct(updated[index].productId), mode);
      updated[index] = {
        ...updated[index],
        entryMode: mode,
        // Always overwrite the price for the newly selected mode — a price
        // typed for the other mode (e.g. per-kg) is not valid here, so it
        // must never carry over. The abandoned mode's own fields are reset
        // to their defaults so stale values don't linger either.
        ...(mode === 'individual'
          ? { packageQuantity: '1', packageUnitPrice: '', unitPrice: prefill.unitPrice }
          : { quantity: '1', unitPrice: '', packageUnitPrice: prefill.packageUnitPrice }),
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: val };
      return updated;
    });
  };

  const handleUnitPriceChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unitPrice: val };
      return updated;
    });
  };

  const handlePackageQuantityChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], packageQuantity: val };
      return updated;
    });
  };

  const handlePackageUnitPriceChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], packageUnitPrice: val };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const lineTotals = items.map((item) => {
    if (item.entryMode === 'package') {
      const q = Math.max(0, parseInt(item.packageQuantity, 10) || 0);
      const c = Math.max(0, parseFloat(item.packageUnitPrice) || 0);
      return q * c;
    }
    const q = Math.max(0, parseInt(item.quantity, 10) || 0);
    const c = Math.max(0, parseFloat(item.unitPrice) || 0);
    return q * c;
  });

  const grandTotal = lineTotals.reduce((sum, val) => sum + val, 0);

  // Total quantity across all lines that actually have a product selected —
  // used for the camera scanner's running tally.
  const totalQuantity = items.reduce((sum, item) => {
    if (!item.productId) return sum;
    const qty =
      item.entryMode === 'package'
        ? parseInt(item.packageQuantity, 10) || 0
        : parseInt(item.quantity, 10) || 0;
    return sum + qty;
  }, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const seen = new Set<string>();
    const payloadItems: CreateSaleItemPayload[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        setError(`Please select a product for item #${i + 1}.`);
        return;
      }
      if (seen.has(it.productId)) {
        const prod = getProduct(it.productId);
        setError(
          `Product "${prod?.name ?? 'selected'}" is added more than once. Combine the quantity into a single line.`
        );
        return;
      }
      seen.add(it.productId);

      if (it.entryMode === 'package') {
        if (!productHasPackaging(it.productId)) {
          setError(`Item #${i + 1}: This product has no bulk packaging configured.`);
          return;
        }

        const pkgQty = parseInt(it.packageQuantity, 10);
        if (!pkgQty || pkgQty <= 0) {
          setError(`Item #${i + 1}: Package quantity must be at least 1.`);
          return;
        }

        const pkgPrice = parseFloat(it.packageUnitPrice);
        if (isNaN(pkgPrice) || pkgPrice < 0) {
          setError(`Item #${i + 1}: Please provide a valid price per package.`);
          return;
        }

        // Client-side stock hint only -- the RPC/record_stock_movement is
        // the actual source of truth and will reject an over-sell even if
        // this check is somehow bypassed or current_stock is stale.
        const max = maxSellable(it.productId, 'package');
        if (pkgQty > max) {
          setError(`Item #${i + 1}: Only ${max} package(s) available in stock.`);
          return;
        }

        payloadItems.push({
          productId: it.productId,
          entryMode: 'package',
          packageQuantity: pkgQty,
          packageUnitPrice: pkgPrice,
        });
      } else {
        const qty = parseInt(it.quantity, 10);
        if (!qty || qty <= 0) {
          setError(`Item #${i + 1}: Quantity must be at least 1.`);
          return;
        }

        const price = parseFloat(it.unitPrice);
        if (isNaN(price) || price < 0) {
          setError(`Item #${i + 1}: Please provide a valid unit price.`);
          return;
        }

        const max = maxSellable(it.productId, 'individual');
        if (qty > max) {
          setError(`Item #${i + 1}: Only ${max} available in stock.`);
          return;
        }

        payloadItems.push({
          productId: it.productId,
          entryMode: 'individual',
          quantity: qty,
          unitPrice: price,
        });
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          referenceNumber: referenceNumber.trim() || null,
          saleDate: saleDate ? new Date(saleDate).toISOString() : undefined,
          paymentMethod: paymentMethod || null,
          notes: notes.trim() || null,
          items: payloadItems,
          idempotencyKey,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to record sale.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred while saving the sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-ink-900 font-serif">
              Record Sale
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Record a sale to a customer. Stock levels will decrease automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -mr-2 text-ink-400 hover:text-ink-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 text-sm text-warn-700 bg-warn-50 border border-warn-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sale-customer-name" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Customer Name <span className="text-ink-500 font-normal">(optional)</span>
              </label>
              <input
                id="sale-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Walk-in, Jane Doe"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="sale-customer-phone" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Customer Phone <span className="text-ink-500 font-normal">(optional)</span>
              </label>
              <input
                id="sale-customer-phone"
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 0712 345678"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sale-ref" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Reference / Receipt #
              </label>
              <input
                id="sale-ref"
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. RCT-1042"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="sale-date" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Sale Date
              </label>
              <input
                id="sale-date"
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px] bg-white"
              />
            </div>

            <div>
              <label htmlFor="sale-payment" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Payment Method
              </label>
              <select
                id="sale-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px] bg-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-ink-900 font-serif">
                Items Sold
              </h3>
              <span className="text-xs text-ink-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div>
              <label htmlFor="sale-barcode-scan" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Scan barcode
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sale-barcode-scan"
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => handleBarcodeInputChange(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Scan or type a barcode, then press Enter"
                  // While the camera overlay is open, block the virtual keyboard
                  // even if this input somehow receives focus — belt-and-braces
                  // alongside the blur() call on the camera button.
                  inputMode={showCameraScanner ? 'none' : undefined}
                  readOnly={showCameraScanner}
                  className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    // Dismiss the on-screen keyboard if it's already open
                    // before the camera overlay takes over.
                    barcodeInputRef.current?.blur();
                    setShowCameraScanner(true);
                  }}
                  aria-label="Scan barcode with camera"
                  className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </button>
              </div>
              {barcodeMessage && (
                <p className="text-xs text-warn-700 mt-1">{barcodeMessage}</p>
              )}
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const selectedProduct = getProduct(item.productId);
                const hasPackaging = productHasPackaging(item.productId);

                return (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-medium text-ink-600 mb-1">
                          Product *
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-h-[44px]"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id} disabled={(p.current_stock ?? 0) <= 0}>
                              {p.name} ({p.sku}) — {p.current_stock ?? 0} {p.stock_unit || 'unit'}s in stock
                            </option>
                          ))}
                        </select>
                      </div>

                      {item.entryMode === 'individual' && (
                        <>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-ink-600 mb-1">
                              Qty *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(index, e.target.value)}
                              placeholder="1"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-h-[44px]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-ink-600 mb-1">
                              Unit Price (KES) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.unitPrice}
                              onChange={(e) => handleUnitPriceChange(index, e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-h-[44px]"
                            />
                          </div>
                        </>
                      )}

                      {item.entryMode === 'package' && (
                        <>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-ink-600 mb-1">
                              Qty ({selectedProduct?.package_unit}s) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={item.packageQuantity}
                              onChange={(e) => handlePackageQuantityChange(index, e.target.value)}
                              placeholder="1"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-h-[44px]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-ink-600 mb-1">
                              Price / {selectedProduct?.package_unit} (KES) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.packageUnitPrice}
                              onChange={(e) => handlePackageUnitPriceChange(index, e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-h-[44px]"
                            />
                          </div>
                        </>
                      )}

                      <div className="sm:col-span-2">
                        <span className="block text-xs font-medium text-ink-600 mb-1">
                          Total
                        </span>
                        <div className="min-h-[44px] flex items-center font-mono font-semibold text-sm text-ink-900 px-2 bg-slate-100 rounded-lg">
                          {formatCurrency(lineTotals[index])}
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length <= 1}
                          className="p-2 text-ink-400 hover:text-red-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          aria-label="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {hasPackaging && (
                      <div className="flex items-center gap-4 pt-1 border-t border-slate-200/60">
                        <span className="text-xs font-medium text-ink-600">Sell as:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`sale-entry-mode-${index}`}
                            checked={item.entryMode === 'individual'}
                            onChange={() => handleEntryModeChange(index, 'individual')}
                            className="text-accent-600 focus:ring-accent-500 w-4 h-4"
                          />
                          <span className="text-xs text-ink-700">
                            Individual {selectedProduct?.stock_unit || 'unit'}s
                          </span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`sale-entry-mode-${index}`}
                            checked={item.entryMode === 'package'}
                            onChange={() => handleEntryModeChange(index, 'package')}
                            className="text-accent-600 focus:ring-accent-500 w-4 h-4"
                          />
                          <span className="text-xs text-ink-700">
                            Whole {selectedProduct?.package_unit}s
                          </span>
                        </label>
                      </div>
                    )}

                    {item.entryMode === 'package' &&
                      selectedProduct?.units_per_package &&
                      (() => {
                        const pkgQty = parseInt(item.packageQuantity, 10) || 0;
                        const pkgPrice = parseFloat(item.packageUnitPrice) || 0;
                        if (pkgQty <= 0) return null;
                        const stockUnits = pkgQty * selectedProduct.units_per_package;
                        const perUnitPrice = pkgPrice > 0 ? pkgPrice / selectedProduct.units_per_package : null;
                        return (
                          <p className="text-xs text-ink-600 bg-white p-2 rounded border border-slate-200">
                            Stock removed: <strong>{stockUnits} {selectedProduct.stock_unit || 'unit'}s</strong>
                            {perUnitPrice !== null && (
                              <>
                                {' '}· ≈ <strong>{formatCurrency(perUnitPrice)}</strong> per {selectedProduct.stock_unit || 'unit'}
                              </>
                            )}
                          </p>
                        );
                      })()}

                    {selectedProduct && (
                      <p className="text-xs text-ink-500">
                        {selectedProduct.current_stock ?? 0} {selectedProduct.stock_unit || 'unit'}s currently in stock
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-accent-700 bg-accent-50 hover:bg-accent-100 border border-accent-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Add another product</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 items-start">
            <div>
              <label htmlFor="sale-notes" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Notes <span className="text-ink-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="sale-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Delivered same day"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[80px] resize-y"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block">
                Grand Total Amount
              </span>
              <div className="text-2xl font-bold font-mono text-ink-900 font-serif">
                {formatCurrency(grandTotal)}
              </div>
              <p className="text-xs text-ink-500">
                {items.length} items sold
              </p>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            className="min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 border border-transparent rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? 'Recording Sale...' : 'Complete Sale'}
          </button>
        </div>
      </div>

      {showCameraScanner && (
        <CameraScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowCameraScanner(false)}
          totalQuantity={totalQuantity}
        />
      )}
    </div>
  );
}
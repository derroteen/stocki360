'use client';

import { useState, useEffect } from 'react';
import { Supplier, ProductStockLevel, CreatePurchaseItemPayload } from '@/lib/supabase/types';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: ProductStockLevel[];
  onSuccess: () => void;
}

interface FormItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

export default function NewPurchaseModal({
  isOpen,
  onClose,
  suppliers,
  products,
  onSuccess,
}: NewPurchaseModalProps) {
  const [supplierId, setSupplierId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<FormItem[]>([
    { productId: '', quantity: '1', unitCost: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSupplierId('');
      setReferenceNumber('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setItems([{ productId: '', quantity: '1', unitCost: '' }]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductChange = (index: number, newProductId: string) => {
    const selectedProd = products.find((p) => p.id === newProductId);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: newProductId,
        // Auto-fill default unit cost from product cost_price if not yet entered
        unitCost:
          updated[index].unitCost ||
          (selectedProd?.cost_price != null ? String(selectedProd.cost_price) : ''),
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

  const handleUnitCostChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unitCost: val };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: '1', unitCost: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Compute live totals
  const lineTotals = items.map((item) => {
    const q = Math.max(0, parseInt(item.quantity, 10) || 0);
    const c = Math.max(0, parseFloat(item.unitCost) || 0);
    return q * c;
  });

  const grandTotal = lineTotals.reduce((sum, val) => sum + val, 0);

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

    // Validation
    const seen = new Set<string>();
    const payloadItems: CreatePurchaseItemPayload[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        setError(`Please select a product for item #${i + 1}.`);
        return;
      }
      if (seen.has(it.productId)) {
        const prod = products.find((p) => p.id === it.productId);
        setError(
          `Product "${prod?.name ?? 'selected'}" is added more than once. Combine the quantity into a single line.`
        );
        return;
      }
      seen.add(it.productId);

      const qty = parseInt(it.quantity, 10);
      if (!qty || qty <= 0) {
        setError(`Item #${i + 1}: Quantity must be at least 1.`);
        return;
      }

      const cost = parseFloat(it.unitCost);
      if (isNaN(cost) || cost < 0) {
        setError(`Item #${i + 1}: Please provide a valid unit cost.`);
        return;
      }

      payloadItems.push({
        productId: it.productId,
        quantity: qty,
        unitCost: cost,
      });
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplierId || null,
          referenceNumber: referenceNumber.trim() || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
          notes: notes.trim() || null,
          items: payloadItems,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to record purchase.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred while saving the purchase.');
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
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-ink-900 font-serif">
              Receive Stock / New Purchase
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Record inventory received from a supplier. Stock levels will increase automatically.
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 text-sm text-warn-700 bg-warn-50 border border-warn-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Supplier & Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="purchase-supplier" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Supplier
              </label>
              <select
                id="purchase-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px] bg-white"
              >
                <option value="">No Supplier / Direct Purchase</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="purchase-ref" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Reference / Invoice #
              </label>
              <input
                id="purchase-ref"
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. INV-10492"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="purchase-date" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Purchase Date
              </label>
              <input
                id="purchase-date"
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px] bg-white"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-ink-900 font-serif">
                Items Received
              </h3>
              <span className="text-xs text-ink-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 items-end"
                >
                  {/* Product selection */}
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
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
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

                  {/* Unit Cost */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ink-600 mb-1">
                      Unit Cost (KES) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unitCost}
                      onChange={(e) => handleUnitCostChange(index, e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-h-[44px]"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="sm:col-span-2">
                    <span className="block text-xs font-medium text-ink-600 mb-1">
                      Total
                    </span>
                    <div className="min-h-[44px] flex items-center font-mono font-semibold text-sm text-ink-900 px-2 bg-slate-100 rounded-lg">
                      {formatCurrency(lineTotals[index])}
                    </div>
                  </div>

                  {/* Remove Button */}
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
              ))}
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

          {/* Notes & Grand Total summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 items-start">
            <div>
              <label htmlFor="purchase-notes" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Notes / Receiving Remarks (optional)
              </label>
              <textarea
                id="purchase-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Delivered by lorry, batch #401..."
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
                {items.length} items to receive into inventory
              </p>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
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
            {isSubmitting ? 'Recording Purchase...' : 'Complete & Receive Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

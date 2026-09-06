'use client';

import { useState } from 'react';
import { ProductStockLevel } from '@/lib/supabase/types';

interface StockMovementModalProps {
  product: ProductStockLevel;
  onClose: () => void;
  onSaved: () => void;
}

type MovementType = 'in' | 'out' | 'adjustment';

export default function StockMovementModal({
  product,
  onClose,
  onSaved,
}: StockMovementModalProps) {
  const [movementType, setMovementType] = useState<MovementType>('in');
  const [quantity, setQuantity] = useState<string>('1');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionKey, setSubmissionKey] = useState<string | null>(null);
  const [receiveAsPackage, setReceiveAsPackage] = useState(false);

  const numQty = parseInt(quantity, 10) || 0;
  const currentStock = product.current_stock ?? 0;

  const resetSubmissionKey = () => {
    setSubmissionKey(null);
  };

  const handleClose = () => {
    resetSubmissionKey();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (movementType === 'out' && numQty > currentStock) {
      setError(`Not enough stock — only ${currentStock} available`);
      return;
    }

    setLoading(true);
    setError(null);

    // Reuse the same key for retries of the same logical submission.
    const key = submissionKey ?? crypto.randomUUID();
    if (!submissionKey) {
      setSubmissionKey(key);
    }

    // Calculate actual stock quantity based on packaging
    const isBulkReceipt = movementType === 'in' && receiveAsPackage && product.package_unit && product.units_per_package;
    const actualQuantity = isBulkReceipt ? numQty * (product.units_per_package || 1) : numQty;

    // Update note if bulk receipt
    let finalNote = note.trim();
    if (isBulkReceipt) {
      const packageText = `Received ${numQty} ${product.package_unit}s (${product.units_per_package} ${product.stock_unit || 'unit'}s/${product.package_unit})`;
      finalNote = finalNote ? `${packageText}. ${finalNote}` : packageText;
    }

    try {
      const response = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          movementType,
          quantity: actualQuantity,
          note: finalNote || null,
          idempotencyKey: key,
        }),
      });

      if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || body?.message || 'An error occurred while recording stock movement');
      }

      onSaved();
      resetSubmissionKey();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while recording stock movement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-surface border border-slate-200 rounded-xl shadow-xl p-6 sm:p-8 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-ink-900 font-serif">
              Record Stock Movement
            </h2>
            <p className="text-xs font-mono text-ink-500 mt-1">
              <span className="font-semibold text-ink-900 font-sans">{product.name}</span> — Current stock: {currentStock}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-500 hover:text-ink-900 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 text-sm text-warn-700 bg-warn-100 border border-warn-600/30 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Movement Type Selector */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">
              Movement Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMovementType('in');
                  resetSubmissionKey();
                }}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer border ${
                  movementType === 'in'
                    ? 'bg-accent-500 text-white border-accent-500 shadow-xs'
                    : 'bg-white text-ink-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Stock In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovementType('out');
                  resetSubmissionKey();
                }}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer border ${
                  movementType === 'out'
                    ? 'bg-accent-500 text-white border-accent-500 shadow-xs'
                    : 'bg-white text-ink-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Stock Out
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovementType('adjustment');
                  resetSubmissionKey();
                }}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer border ${
                  movementType === 'adjustment'
                    ? 'bg-accent-500 text-white border-accent-500 shadow-xs'
                    : 'bg-white text-ink-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Adjustment
              </button>
            </div>
          </div>

          {/* Packaging Selector (Only for IN movements if product has packaging) */}
          {movementType === 'in' && product.package_unit && product.units_per_package && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                Receive stock as:
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="receiveMode"
                    checked={!receiveAsPackage}
                    onChange={() => {
                      setReceiveAsPackage(false);
                      resetSubmissionKey();
                    }}
                    className="text-accent-600 focus:ring-accent-500 w-4 h-4"
                  />
                  <span className="text-sm text-ink-700">
                    Individual {product.stock_unit || 'unit'}s
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="receiveMode"
                    checked={receiveAsPackage}
                    onChange={() => {
                      setReceiveAsPackage(true);
                      resetSubmissionKey();
                    }}
                    className="text-accent-600 focus:ring-accent-500 w-4 h-4"
                  />
                  <span className="text-sm text-ink-700">
                    Bulk {product.package_unit}s
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="quantity">
              Quantity {receiveAsPackage && movementType === 'in' ? `(in ${product.package_unit}s)` : `(in ${product.stock_unit || 'unit'}s)`}
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                resetSubmissionKey();
              }}
              className="w-full min-h-[44px] px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            {receiveAsPackage && movementType === 'in' && product.units_per_package && numQty > 0 && (
              <p className="mt-2 text-sm text-ink-600 bg-slate-50 p-2 rounded border border-slate-100">
                Stock added: <strong>{numQty * product.units_per_package} {product.stock_unit || 'unit'}s</strong>
              </p>
            )}
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="note">
              Note <span className="text-ink-500 font-normal">(optional)</span>
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                resetSubmissionKey();
              }}
              className="w-full min-h-[44px] px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="e.g. Restock from supplier, Damaged goods"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

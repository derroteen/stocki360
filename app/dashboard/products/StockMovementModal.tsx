'use client';

import { useState } from 'react';
import { ProductStockLevel } from '@/lib/supabase/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

  const numQty = parseInt(quantity, 10) || 0;
  const currentStock = product.current_stock ?? 0;
  const showNegativeWarning = movementType === 'out' && numQty > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: insertErr } = await supabase
        .from('stock_movements')
        .insert([
          {
            product_id: product.id,
            movement_type: movementType,
            quantity: numQty,
            note: note.trim() || null,
          },
        ]);

      if (insertErr) throw insertErr;

      onSaved();
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
            onClick={onClose}
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
                onClick={() => setMovementType('in')}
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
                onClick={() => setMovementType('out')}
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
                onClick={() => setMovementType('adjustment')}
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

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="quantity">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Inline Warning for Stock Out below zero */}
          {showNegativeWarning && (
            <div className="p-3 text-xs text-warn-700 bg-warn-100 border border-warn-600/30 rounded-lg flex items-center gap-2">
              <span>⚠️</span>
              <span>This will take stock below zero</span>
            </div>
          )}

          {/* Note Input */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="note">
              Note <span className="text-ink-500 font-normal">(optional)</span>
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="e.g. Restock from supplier, Damaged goods"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
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

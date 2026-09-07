'use client';

import { useEffect, useState } from 'react';
import { ProductStockLevel } from '@/lib/supabase/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface MovementHistoryModalProps {
  product: ProductStockLevel;
  onClose: () => void;
}

interface StockMovement {
  id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  note: string | null;
  created_by_email: string | null;
  created_at: string;
}

const typeLabels: Record<StockMovement['movement_type'], string> = {
  in: 'Stock in',
  out: 'Stock out',
  adjustment: 'Adjustment',
};

const typeStyles: Record<StockMovement['movement_type'], string> = {
  in: 'bg-good-100 text-good-700 border border-good-600/30',
  out: 'bg-warn-100 text-warn-700 border border-warn-600/30',
  adjustment: 'bg-accent-50 text-accent-700 border border-accent-100',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatQuantity(movement: StockMovement) {
  const prefix = movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '=';
  return `${prefix}${movement.quantity}`;
}

export default function MovementHistoryModal({ product, onClose }: MovementHistoryModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    const loadMovements = async () => {
      const { data, error: queryError } = await supabase
        .from('stock_movements')
        .select('id,movement_type,quantity,note,created_by_email,created_at')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!isMounted) return;

      if (queryError) {
        setError(queryError.message || 'Unable to load movement history.');
        setLoading(false);
        return;
      }

      setMovements((data ?? []) as StockMovement[]);
      setLoading(false);
    };

    loadMovements();

    return () => {
      isMounted = false;
    };
  }, [product.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-xl font-bold font-serif text-ink-900">
            {product.name} — Movement History
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] text-xl text-ink-500 transition-colors hover:text-ink-900"
            aria-label="Close movement history"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
          {loading && <p className="py-8 text-center text-sm text-ink-500">Loading movement history...</p>}

          {error && (
            <div className="rounded-lg border border-warn-600/30 bg-warn-100 p-3 text-sm text-warn-700">
              {error}
            </div>
          )}

          {!loading && !error && movements.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-500">
              No stock movements recorded for this product yet.
            </p>
          )}

          {!loading && !error && movements.length > 0 && (
            <>
              <div className="hidden sm:block overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                      <th className="px-4 py-3 font-semibold">Note</th>
                      <th className="px-4 py-3 font-semibold">Recorded by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatDate(movement.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyles[movement.movement_type]}`}>
                            {typeLabels[movement.movement_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-ink-900">{formatQuantity(movement)}</td>
                        <td className="max-w-xs px-4 py-3 text-ink-600">{movement.note || '-'}</td>
                        <td className="px-4 py-3 text-ink-600">{movement.created_by_email || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 sm:hidden">
                {movements.map((movement) => (
                  <div key={movement.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyles[movement.movement_type]}`}>
                        {typeLabels[movement.movement_type]}
                      </span>
                      <span className="font-mono font-semibold text-ink-900">{formatQuantity(movement)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="block text-xs text-ink-500">Date</span>
                        <span className="text-ink-700">{formatDate(movement.created_at)}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-ink-500">Recorded by</span>
                        <span className="break-words text-ink-700">{movement.created_by_email || 'System'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs text-ink-500">Note</span>
                      <span className="text-sm text-ink-700">{movement.note || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {movements.length === 50 && (
                <p className="mt-4 text-xs text-ink-500">Showing the most recent 50 movements.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

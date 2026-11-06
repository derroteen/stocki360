'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ProductStockLevel, StockMovementDelta } from '@/lib/supabase/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface MovementHistoryModalProps {
  product: ProductStockLevel;
  onClose: () => void;
}

const PAGE_SIZE = 50;

const SOURCE_LABELS: Record<StockMovementDelta['source'], string> = {
  sale: 'Sale',
  purchase: 'Purchase',
  opening: 'Opening',
  write_off: 'Write-off',
  count_correction: 'Count correction',
  customer_return: 'Customer return',
  legacy: 'Before tracking',
};

const SOURCE_STYLES: Record<StockMovementDelta['source'], string> = {
  sale: 'border-danger-200 bg-danger-50 text-danger-700',
  purchase: 'border-good-600/30 bg-good-100 text-good-700',
  opening: 'border-accent-100 bg-accent-50 text-accent-text',
  write_off: 'border-warn-600/30 bg-warn-100 text-warn-700',
  count_correction: 'border-warn-600/30 bg-warn-100 text-warn-700',
  customer_return: 'border-good-600/30 bg-good-100 text-good-700',
  legacy: 'border-line bg-subtle text-ink-600',
};

const REASON_LABELS: Record<string, string> = {
  damaged: 'Damaged',
  expired: 'Expired',
  lost: 'Lost or stolen',
  own_use: 'Used in the shop',
  supplier_return: 'Returned to supplier',
  other: 'Other',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function sourceLabel(row: StockMovementDelta) {
  if (row.source === 'legacy' && row.movement_type === 'adjustment') {
    return 'Before tracking';
  }
  return SOURCE_LABELS[row.source];
}

function reasonLabel(row: StockMovementDelta) {
  if (row.source === 'legacy' && row.movement_type === 'adjustment') {
    return row.stock_after == null ? 'Count adjustment' : `Count (set to ${row.stock_after})`;
  }
  return row.reason_code ? REASON_LABELS[row.reason_code] ?? row.reason_code : '—';
}

function signedDelta(delta: number) {
  return `${delta > 0 ? '+' : ''}${delta}`;
}

export default function MovementHistoryModal({ product, onClose }: MovementHistoryModalProps) {
  const [movements, setMovements] = useState<StockMovementDelta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPage = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: queryError } = await supabase
          .from('stock_movement_deltas')
          .select('id,product_id,movement_type,quantity,source,reason_code,reference_type,reference_id,unit_cost,note,created_at,created_by,created_by_email,stock_before,stock_after,delta')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (!isMounted) return;
        if (queryError) {
          setError(queryError.message || 'Unable to load movement history.');
          setLoading(false);
          return;
        }

        const rows = (data ?? []) as StockMovementDelta[];
        setMovements(rows);
        setHasMore(rows.length === PAGE_SIZE);
        setLoading(false);
      } catch (queryError) {
        if (!isMounted) return;
        console.error('Unable to load movement history:', queryError);
        setError('Unable to load movement history.');
        setLoading(false);
      }
    };

    void loadPage();
    return () => {
      isMounted = false;
    };
  }, [product.id]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const offset = movements.length;
      const { data, error: queryError } = await supabase
        .from('stock_movement_deltas')
        .select('id,product_id,movement_type,quantity,source,reason_code,reference_type,reference_id,unit_cost,note,created_at,created_by,created_by_email,stock_before,stock_after,delta')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (queryError) {
        setError(queryError.message || 'Unable to load more movement history.');
        setLoadingMore(false);
        return;
      }

      const rows = (data ?? []) as StockMovementDelta[];
      setMovements((current) => [...current, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (queryError) {
      console.error('Unable to load more movement history:', queryError);
      setError('Unable to load more movement history.');
      setLoadingMore(false);
    }
  };

  const isManual = (row: StockMovementDelta) =>
    row.source === 'write_off' || row.source === 'count_correction' || row.source === 'legacy';

  const renderRow = (row: StockMovementDelta, mobile = false) => mobile ? (
    <div key={row.id} className="space-y-3 rounded-lg border border-line bg-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${SOURCE_STYLES[row.source]}`}>
              {sourceLabel(row)}
            </span>
            <span className={`font-mono font-bold ${row.delta > 0 ? 'text-good-700' : row.delta < 0 ? 'text-danger-700' : 'text-ink-700'}`}>
              {signedDelta(row.delta)}
            </span>
          </div>
          {isManual(row) && <span className="inline-flex rounded bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">Manual record</span>}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-ink-500">Date</dt><dd className="break-words text-ink-700">{formatDate(row.created_at)}</dd></div>
            <div><dt className="text-xs text-ink-500">Stock after</dt><dd className="text-ink-700">{row.stock_after ?? '—'}</dd></div>
            <div><dt className="text-xs text-ink-500">Reason</dt><dd className="break-words text-ink-700">{reasonLabel(row)}</dd></div>
            <div><dt className="text-xs text-ink-500">By</dt><dd className="break-words text-ink-700">{row.created_by_email || 'System'}</dd></div>
          </dl>
          <div className="break-words text-sm text-ink-700"><span className="text-xs text-ink-500">Note: </span>{row.note || '—'}</div>
          {row.reference_id && row.reference_type && (
            <Link href={row.reference_type === 'sale' ? `/dashboard/sales?details=${encodeURIComponent(row.reference_id)}` : `/dashboard/purchases?details=${encodeURIComponent(row.reference_id)}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-text underline underline-offset-2">
              View {row.reference_type}
            </Link>
          )}
    </div>
  ) : (
        <tr key={row.id} className={isManual(row) ? 'bg-subtle/60' : undefined}>
          <td className="whitespace-nowrap px-3 py-3 text-ink-600">{formatDate(row.created_at)}</td>
          <td className="px-3 py-3">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${SOURCE_STYLES[row.source]}`}>
              {sourceLabel(row)}
            </span>
            {isManual(row) && <span className="ml-1 inline-block rounded bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-600">Manual</span>}
          </td>
          <td className="max-w-40 px-3 py-3 text-ink-600">{reasonLabel(row)}</td>
          <td className={`whitespace-nowrap px-3 py-3 text-right font-mono font-semibold ${row.delta > 0 ? 'text-good-700' : row.delta < 0 ? 'text-danger-700' : 'text-ink-700'}`}>{signedDelta(row.delta)}</td>
          <td className="px-3 py-3 text-right font-mono text-ink-700">{row.stock_after ?? '—'}</td>
          <td className="max-w-40 break-words px-3 py-3 text-ink-600">{row.created_by_email || 'System'}</td>
          <td className="max-w-48 break-words px-3 py-3 text-ink-600">{row.note || '—'}</td>
          <td className="px-3 py-3">
            {row.reference_id && row.reference_type ? (
              <Link href={row.reference_type === 'sale' ? `/dashboard/sales?details=${encodeURIComponent(row.reference_id)}` : `/dashboard/purchases?details=${encodeURIComponent(row.reference_id)}`} className="font-semibold text-accent-text underline underline-offset-2">
                View
              </Link>
            ) : '—'}
          </td>
        </tr>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-3 backdrop-blur-xs sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="movement-history-title" className="flex max-h-[90vh] max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-line bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-4 sm:px-6">
          <h2 id="movement-history-title" className="min-w-0 break-words text-base font-bold font-serif text-ink-900 sm:text-xl">
            {product.name} — Movement history
          </h2>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] text-xl text-ink-500 hover:text-ink-900" aria-label="Close movement history">×</button>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && <p className="py-8 text-center text-sm text-ink-500">Loading movement history…</p>}
          {error && <div role="alert" className="mb-4 rounded-lg border border-warn-600/30 bg-warn-100 p-3 text-sm text-warn-700">{error}</div>}
          {!loading && !error && movements.length === 0 && <p className="py-8 text-center text-sm text-ink-500">No stock movements recorded for this product yet.</p>}

          {movements.length > 0 && (
            <>
              <div className="hidden overflow-x-auto rounded-lg border border-line sm:block">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="bg-subtle text-xs uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">Source</th>
                      <th className="px-3 py-3 font-semibold">Reason</th>
                      <th className="px-3 py-3 text-right font-semibold">Change</th>
                      <th className="px-3 py-3 text-right font-semibold">Stock after</th>
                      <th className="px-3 py-3 font-semibold">By</th>
                      <th className="px-3 py-3 font-semibold">Note</th>
                      <th className="px-3 py-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {movements.map((row) => {
                      const result = renderRow(row);
                      return result;
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 sm:hidden">{movements.map((row) => renderRow(row, true))}</div>
              {hasMore && (
                <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-4 min-h-[44px] w-full rounded-lg border border-line-strong bg-card px-4 text-sm font-semibold text-ink-700 hover:bg-subtle disabled:opacity-60 sm:w-auto">
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

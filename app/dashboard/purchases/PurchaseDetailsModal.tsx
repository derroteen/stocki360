'use client';

import { Purchase } from '@/lib/supabase/types';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

export default function PurchaseDetailsModal({
  isOpen,
  onClose,
  purchase,
}: PurchaseDetailsModalProps) {
  if (!isOpen || !purchase) return null;

  const formatCurrency = (val: number | null | undefined) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val ?? 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const items = purchase.purchase_items ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink-900 font-serif">
                Purchase Order Details
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-good-100 text-good-700 border border-good-600/30">
                Received in stock
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Ref: {purchase.reference_number || `#${purchase.id.slice(0, 8)}`} • Received {formatDate(purchase.purchase_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-ink-400 hover:text-ink-600 rounded-full hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Supplier and Meta Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                Supplier
              </span>
              <div className="font-semibold text-ink-900">
                {purchase.supplier?.name || 'Direct / Unspecified Supplier'}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                Purchase Date
              </span>
              <div className="text-ink-900 font-mono">
                {formatDate(purchase.purchase_date)}
              </div>
            </div>

            {purchase.reference_number && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                  Invoice / Reference #
                </span>
                <div className="font-mono text-ink-900 font-medium">
                  {purchase.reference_number}
                </div>
              </div>
            )}

            {purchase.notes && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                  Notes
                </span>
                <p className="text-xs text-ink-700 whitespace-pre-wrap">{purchase.notes}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-ink-900 font-serif">
              Purchased Items ({items.length})
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-ink-700 text-xs font-semibold">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-ink-900">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-ink-900">
                          {item.product?.name || 'Product'}
                        </div>
                        {item.product?.sku && (
                          <div className="font-mono text-xs text-ink-500">
                            {item.product.sku}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        +{item.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-ink-600">
                        {formatCurrency(item.unit_cost)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-ink-900">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold">
                    <td colSpan={3} className="py-3.5 px-4 text-right text-xs uppercase tracking-wider text-ink-600">
                      Grand Total
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-ink-900 font-bold">
                      {formatCurrency(purchase.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-sm font-medium text-ink-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

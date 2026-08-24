'use client';

import { Sale } from '@/lib/supabase/types';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export default function SaleDetailsModal({ isOpen, onClose, sale }: SaleDetailsModalProps) {
  if (!isOpen || !sale) return null;

  const formatCurrency = (val: number | null | undefined) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val ?? 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(dateStr)
      );
    } catch {
      return dateStr;
    }
  };

  const items = sale.sale_items ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink-900 font-serif">Sale Details</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-good-100 text-good-700 border border-good-600/30">
                Stock removed
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Ref: {sale.reference_number || `#${sale.id.slice(0, 8)}`} • Sold {formatDate(sale.sale_date)}
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                Customer
              </span>
              <div className="font-semibold text-ink-900">
                {sale.customer_name || 'Walk-in / Unspecified'}
              </div>
              {sale.customer_phone && (
                <div className="text-xs text-ink-500 font-mono mt-0.5">{sale.customer_phone}</div>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                Sale Date
              </span>
              <div className="text-ink-900 font-mono">{formatDate(sale.sale_date)}</div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                Payment Method
              </span>
              <div className="font-medium text-ink-900">{sale.payment_method || 'Not specified'}</div>
            </div>

            {sale.reference_number && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                  Receipt / Reference #
                </span>
                <div className="font-mono text-ink-900 font-medium">{sale.reference_number}</div>
              </div>
            )}

            {sale.notes && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block mb-1">
                  Notes
                </span>
                <p className="text-xs text-ink-700 whitespace-pre-wrap">{sale.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-ink-900 font-serif">
              Items Sold ({items.length})
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-ink-700 text-xs font-semibold">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
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
                          <div className="font-mono text-xs text-ink-500">{item.product.sku}</div>
                        )}
                        {item.entry_mode === 'package' && item.package_quantity && item.package_unit_snapshot && (
                          <div className="text-xs text-ink-500 mt-0.5">
                            Sold as {item.package_quantity} {item.package_unit_snapshot}
                            {item.package_quantity === 1 ? '' : 's'}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        -{item.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-ink-600">
                        {formatCurrency(item.unit_price)}
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
                      {formatCurrency(sale.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

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
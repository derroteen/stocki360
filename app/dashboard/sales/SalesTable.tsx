'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sale, ProductStockLevel } from '@/lib/supabase/types';
import NewSaleModal from './NewSaleModal';
import SaleDetailsModal from './SaleDetailsModal';

interface SalesTableProps {
  sales: Sale[];
  activeProducts: ProductStockLevel[];
}

export default function SalesTable({ sales, activeProducts }: SalesTableProps) {
  const router = useRouter();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const formatCurrency = (val: number | null | undefined) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val ?? 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const paymentMethods = Array.from(
    new Set(sales.map((s) => s.payment_method).filter((m): m is string => Boolean(m)))
  );

  const filteredSales =
    paymentFilter === 'all' ? sales : sales.filter((s) => s.payment_method === paymentFilter);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const handleSaveSuccess = () => {
    router.refresh();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 font-serif">
              Sales
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-50 text-accent-700 border border-accent-100">
              {sales.length} {sales.length === 1 ? 'sale' : 'sales'}
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Record sales to customers and track revenue and stock-out.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
          >
            <span className="text-lg leading-none">+</span> Record Sale
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Total Sales
          </span>
          <div className="text-2xl font-bold text-ink-900 font-serif">
            {filteredSales.length}
          </div>
        </div>

        <div className="bg-surface border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Total Revenue
          </span>
          <div className="text-2xl font-bold text-ink-900 font-serif">
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div className="bg-surface border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Payment Methods Used
          </span>
          <div className="text-2xl font-bold text-ink-900 font-serif">
            {paymentMethods.length}
          </div>
        </div>
      </div>

      {paymentMethods.length > 0 && (
        <div className="flex items-center gap-3">
          <label htmlFor="filter-payment" className="text-xs font-semibold text-ink-600">
            Filter by Payment Method:
          </label>
          <select
            id="filter-payment"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-ink-900 focus:ring-2 focus:ring-accent-500 min-h-[36px]"
          >
            <option value="all">All Methods ({sales.length})</option>
            {paymentMethods.map((m) => {
              const count = sales.filter((s) => s.payment_method === m).length;
              return (
                <option key={m} value={m}>
                  {m} ({count})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {filteredSales.length === 0 ? (
        <div className="bg-surface border border-slate-200 rounded-xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-500 border border-accent-100 flex items-center justify-center mx-auto text-xl font-serif font-bold">
            💰
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-ink-900 font-serif">
              {paymentFilter === 'all' ? 'No sales recorded yet' : 'No sales found for this payment method'}
            </h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto">
              {paymentFilter === 'all'
                ? 'Record a sale to a customer to update your inventory and revenue records.'
                : 'Try selecting a different payment method or recording a new sale.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
          >
            <span className="text-lg leading-none">+</span> Record Sale
          </button>
        </div>
      ) : (
        <>
          <div className="hidden sm:block overflow-hidden bg-surface border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-surface text-ink-700 font-medium">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Receipt #</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-center">Items Sold</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-ink-900">
                {filteredSales.map((sale) => {
                  const itemCount = sale.sale_items?.length ?? 0;
                  const totalUnits = (sale.sale_items ?? []).reduce(
                    (sum: number, it) => sum + (it.quantity || 0),
                    0
                  );

                  return (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="cursor-pointer hover:bg-slate-100/60 transition-colors"
                    >
                      <td className="py-4 px-4 font-mono text-xs text-ink-700 font-medium">
                        {formatDate(sale.sale_date)}
                      </td>
                      <td className="py-4 px-4 font-semibold text-ink-900">
                        {sale.customer_name || (
                          <span className="text-ink-400 font-normal italic">Walk-in</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-ink-600">
                        {sale.reference_number || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-ink-600">
                        {sale.payment_method || '-'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 border border-accent-100">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'} (-{totalUnits} units)
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-ink-900">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSale(sale);
                          }}
                          className="min-h-[36px] px-3 py-1 text-xs font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 border border-accent-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="block sm:hidden space-y-3">
            {filteredSales.map((sale) => {
              const itemCount = sale.sale_items?.length ?? 0;
              const totalUnits = (sale.sale_items ?? []).reduce(
                (sum: number, it) => sum + (it.quantity || 0),
                0
              );

              return (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="bg-surface border border-slate-200 rounded-xl p-4 min-h-[44px] space-y-3 cursor-pointer hover:border-accent-500/50 active:bg-slate-100 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs text-ink-500 block">
                        {formatDate(sale.sale_date)}
                      </span>
                      <h4 className="font-semibold text-ink-900 text-base">
                        {sale.customer_name || 'Walk-in'}
                      </h4>
                      {sale.reference_number && (
                        <span className="text-xs font-mono text-ink-600 block mt-0.5">
                          Ref: {sale.reference_number}
                        </span>
                      )}
                    </div>
                    <div className="text-right font-mono font-bold text-ink-900 text-base">
                      {formatCurrency(sale.total_amount)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200/60">
                    <span className="text-xs font-medium text-ink-600">
                      {itemCount} items (-{totalUnits} units) · {sale.payment_method || 'No payment method'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSale(sale);
                      }}
                      className="min-h-[36px] px-3 py-1 text-xs font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 border border-accent-200 rounded-lg transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <NewSaleModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        products={activeProducts}
        onSuccess={handleSaveSuccess}
      />

      <SaleDetailsModal
        isOpen={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
      />
    </div>
  );
}
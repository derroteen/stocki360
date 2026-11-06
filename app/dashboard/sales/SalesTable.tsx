'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sale, ProductStockLevel, ProductBarcode } from '@/lib/supabase/types';
import NewSaleModal from './NewSaleModal';
import SaleDetailsModal from './SaleDetailsModal';
import ReceiptModal from '@/components/receipts/ReceiptModal';

interface SalesTableProps {
  sales: Sale[];
  activeProducts: ProductStockLevel[];
  barcodes: ProductBarcode[];
  businessName: string | null;
  initialDetailsId: string | null;
}

export default function SalesTable({ sales, activeProducts, barcodes, businessName, initialDetailsId }: SalesTableProps) {
  const router = useRouter();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(
    () => sales.find((sale) => sale.id === initialDetailsId) ?? null,
  );
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [recentSale, setRecentSale] = useState<Sale | null>(null);
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
      return new Intl.DateTimeFormat('en-KE', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(new Date(dateStr));
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

  const handleSaveSuccess = (sale: Sale) => {
    setRecentSale(sale);
    router.refresh();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 font-serif">
              Sales
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-50 text-accent-text border border-accent-100">
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

      {recentSale && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-subtle px-4 py-2 text-sm text-ink-700" role="status">
          <span>Sale recorded. View your receipt:</span>
          <button
            type="button"
            onClick={() => {
              setReceiptSale(recentSale);
              setRecentSale(null);
            }}
            className="min-h-[44px] rounded-lg px-3 font-semibold text-accent-text hover:bg-subtle-strong"
            aria-label="View receipt for the sale just recorded"
          >
            View receipt
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-panel border border-line rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Total Sales
          </span>
          <div className="text-2xl font-bold text-ink-900 font-serif">
            {filteredSales.length}
          </div>
        </div>

        <div className="bg-panel border border-line rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Total Revenue
          </span>
          <div className="text-2xl font-bold text-ink-900 font-serif">
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div className="bg-panel border border-line rounded-xl p-4 space-y-1 shadow-2xs">
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
            className="px-3 py-1.5 border border-line-strong rounded-lg text-xs bg-card text-ink-900 focus:ring-2 focus:ring-accent-500 min-h-[36px]"
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
        <div className="flex flex-col gap-5 rounded-xl border border-line bg-panel p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent-100 bg-accent-50 font-serif text-xl font-bold text-accent-bright">
              S
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-ink-900 font-serif">
                {paymentFilter === 'all' ? 'No sales recorded yet' : 'No sales found for this payment method'}
              </h3>
              <p className="max-w-xl text-sm text-ink-500">
                This page records sales and updates your inventory and revenue records.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 justify-end">
            {activeProducts.some((product) => (product.current_stock ?? 0) > 0) ? (
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
              >
                <span className="text-lg leading-none">+</span> Record Sale
              </button>
            ) : (
              <Link
                href={activeProducts.length === 0 ? '/dashboard/products' : '/dashboard/purchases'}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent-600 px-5 text-sm font-semibold text-white hover:bg-accent-700"
              >
                {activeProducts.length === 0 ? 'Add a product' : 'Add stock'}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="hidden sm:block rounded-xl border border-line bg-panel shadow-xs">
            <div
              className="overflow-x-auto overscroll-x-contain rounded-xl"
              tabIndex={0}
              role="region"
              aria-label="Sales"
            >
            <table className="w-full min-w-[900px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-panel text-ink-700 font-medium">
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
                      className="cursor-pointer hover:bg-subtle-strong/60 transition-colors"
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-text border border-accent-100">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'} (-{totalUnits} units)
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-ink-900">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSale(sale);
                            }}
                            className="min-h-[44px] px-3 py-1 text-xs font-medium text-accent-text bg-accent-50 hover:bg-accent-100 border border-accent-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReceiptSale(sale);
                            }}
                            className="min-h-[44px] px-3 py-1 text-xs font-medium text-ink-700 bg-card hover:bg-subtle border border-line-strong rounded-lg transition-colors cursor-pointer"
                            aria-label={`View receipt for sale ${sale.id.slice(-8).toUpperCase()}`}
                          >
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
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
                  className="bg-panel border border-line rounded-xl p-4 min-h-[44px] space-y-3 cursor-pointer hover:border-accent-500/50 active:bg-subtle-strong transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-ink-500 block">
                        {formatDate(sale.sale_date)}
                      </span>
                      <h4 className="break-words font-semibold text-ink-900 text-base">
                        {sale.customer_name || 'Walk-in'}
                      </h4>
                      {sale.reference_number && (
                        <span className="break-all text-xs font-mono text-ink-600 block mt-0.5">
                          Ref: {sale.reference_number}
                        </span>
                      )}
                    </div>
                    <div className="text-right font-mono font-bold text-ink-900 text-base">
                      {formatCurrency(sale.total_amount)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm pt-2 border-t border-line/60">
                    <span className="min-w-0 flex-1 break-words text-xs font-medium text-ink-600">
                      {itemCount} items (-{totalUnits} units) · {sale.payment_method || 'No payment method'}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSale(sale);
                        }}
                        className="min-h-[44px] px-3 py-1 text-xs font-medium text-accent-text bg-accent-50 hover:bg-accent-100 border border-accent-200 rounded-lg transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptSale(sale);
                        }}
                        className="min-h-[44px] px-3 py-1 text-xs font-medium text-ink-700 bg-card hover:bg-subtle border border-line-strong rounded-lg transition-colors cursor-pointer"
                        aria-label={`View receipt for sale ${sale.id.slice(-8).toUpperCase()}`}
                      >
                        Receipt
                      </button>
                    </div>
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
        barcodes={barcodes}
        onSuccess={handleSaveSuccess}
      />

      <SaleDetailsModal
        isOpen={Boolean(selectedSale)}
        onClose={() => {
          setSelectedSale(null);
          if (initialDetailsId) router.replace('/dashboard/sales');
        }}
        onReceipt={setReceiptSale}
        sale={selectedSale}
      />

      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          businessName={businessName}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </div>
  );
}
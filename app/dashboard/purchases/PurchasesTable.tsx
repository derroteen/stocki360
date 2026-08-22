'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Purchase, Supplier, ProductStockLevel } from '@/lib/supabase/types';
import NewPurchaseModal from './NewPurchaseModal';
import PurchaseDetailsModal from './PurchaseDetailsModal';

interface PurchasesTableProps {
  purchases: Purchase[];
  activeSuppliers: Supplier[];
  activeProducts: ProductStockLevel[];
}

export default function PurchasesTable({
  purchases,
  activeSuppliers,
  activeProducts,
}: PurchasesTableProps) {
  const router = useRouter();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

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
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const filteredPurchases =
    supplierFilter === 'all'
      ? purchases
      : purchases.filter((p) => p.supplier_id === supplierFilter);

  const totalSpent = filteredPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const handleSaveSuccess = () => {
    router.refresh();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 font-serif">
              Purchases & Stock Receiving
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-50 text-accent-700 border border-accent-100">
              {purchases.length} {purchases.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Record incoming inventory from suppliers and track receiving invoices.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
          >
            <span className="text-lg leading-none">+</span> Receive Stock / New Purchase
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Total Purchase Orders
          </span>
          <div className="text-2xl font-bold text-ink-900 font-serif">
            {filteredPurchases.length}
          </div>
        </div>

        <div className="bg-surface border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Total Value Received
          </span>
          <div className="text-2xl font-bold text-ink-900 font-serif">
            {formatCurrency(totalSpent)}
          </div>
        </div>

        <div className="bg-surface border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Active Suppliers
          </span>
          <div className="text-2xl font-bold text-ink-900 font-serif">
            {activeSuppliers.length}
          </div>
        </div>
      </div>

      {/* Filter by supplier */}
      {activeSuppliers.length > 0 && (
        <div className="flex items-center gap-3">
          <label htmlFor="filter-supplier" className="text-xs font-semibold text-ink-600">
            Filter by Supplier:
          </label>
          <select
            id="filter-supplier"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-ink-900 focus:ring-2 focus:ring-accent-500 min-h-[36px]"
          >
            <option value="all">All Suppliers ({purchases.length})</option>
            {activeSuppliers.map((s) => {
              const count = purchases.filter((p) => p.supplier_id === s.id).length;
              return (
                <option key={s.id} value={s.id}>
                  {s.name} ({count})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <div className="bg-surface border border-slate-200 rounded-xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-500 border border-accent-100 flex items-center justify-center mx-auto text-xl font-serif font-bold">
            📦
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-ink-900 font-serif">
              {supplierFilter === 'all'
                ? 'No purchases recorded yet'
                : 'No purchases found for this supplier'}
            </h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto">
              {supplierFilter === 'all'
                ? 'Record stock received from suppliers to update your inventory counts and purchase records.'
                : 'Try selecting a different supplier or recording a new purchase.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
          >
            <span className="text-lg leading-none">+</span> Receive Stock / New Purchase
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table (>= 640px) */}
          <div className="hidden sm:block overflow-hidden bg-surface border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-surface text-ink-700 font-medium">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Invoice / Ref #</th>
                  <th className="py-3.5 px-4 text-center">Items Received</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-ink-900">
                {filteredPurchases.map((purchase) => {
                  const itemCount = purchase.purchase_items?.length ?? 0;
                  const totalUnits = (purchase.purchase_items ?? []).reduce(
                    (sum, it) => sum + (it.quantity || 0),
                    0
                  );

                  return (
                    <tr
                      key={purchase.id}
                      onClick={() => setSelectedPurchase(purchase)}
                      className="cursor-pointer hover:bg-slate-100/60 transition-colors"
                    >
                      <td className="py-4 px-4 font-mono text-xs text-ink-700 font-medium">
                        {formatDate(purchase.purchase_date)}
                      </td>
                      <td className="py-4 px-4 font-semibold text-ink-900">
                        {purchase.supplier?.name || (
                          <span className="text-ink-400 font-normal italic">Direct / None</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-ink-600">
                        {purchase.reference_number || '-'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 border border-accent-100">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'} (+{totalUnits} units)
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-ink-900">
                        {formatCurrency(purchase.total_amount)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPurchase(purchase);
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

          {/* Mobile Stacked Card Layout (< 640px) */}
          <div className="block sm:hidden space-y-3">
            {filteredPurchases.map((purchase) => {
              const itemCount = purchase.purchase_items?.length ?? 0;
              const totalUnits = (purchase.purchase_items ?? []).reduce(
                (sum, it) => sum + (it.quantity || 0),
                0
              );

              return (
                <div
                  key={purchase.id}
                  onClick={() => setSelectedPurchase(purchase)}
                  className="bg-surface border border-slate-200 rounded-xl p-4 min-h-[44px] space-y-3 cursor-pointer hover:border-accent-500/50 active:bg-slate-100 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs text-ink-500 block">
                        {formatDate(purchase.purchase_date)}
                      </span>
                      <h4 className="font-semibold text-ink-900 text-base">
                        {purchase.supplier?.name || 'Direct / None'}
                      </h4>
                      {purchase.reference_number && (
                        <span className="text-xs font-mono text-ink-600 block mt-0.5">
                          Ref: {purchase.reference_number}
                        </span>
                      )}
                    </div>
                    <div className="text-right font-mono font-bold text-ink-900 text-base">
                      {formatCurrency(purchase.total_amount)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200/60">
                    <span className="text-xs font-medium text-ink-600">
                      {itemCount} items (+{totalUnits} units received)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPurchase(purchase);
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

      {/* New Purchase Modal */}
      <NewPurchaseModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        suppliers={activeSuppliers}
        products={activeProducts}
        onSuccess={handleSaveSuccess}
      />

      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={Boolean(selectedPurchase)}
        onClose={() => setSelectedPurchase(null)}
        purchase={selectedPurchase}
      />
    </div>
  );
}

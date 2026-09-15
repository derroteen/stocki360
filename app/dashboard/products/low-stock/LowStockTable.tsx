'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductStockLevel, Category, Supplier, ProductBarcode } from '@/lib/supabase/types';
import { getStockStatus, StockStatus, prioritizeLowStockProducts } from '@/lib/stock-alerts';
import StockMovementModal from '../StockMovementModal';
import ProductModal from '../ProductModal';

interface LowStockTableProps {
  products: ProductStockLevel[];
  allCategories: Category[];
  allSuppliers: Supplier[];
  activeCategories: Category[];
  activeSuppliers: Supplier[];
  barcodes: ProductBarcode[];
}

type AlertFilter = 'all' | 'out_of_stock' | 'low_stock';

export default function LowStockTable({
  products,
  allCategories,
  allSuppliers,
  activeCategories,
  activeSuppliers,
  barcodes,
}: LowStockTableProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [movementProduct, setMovementProduct] = useState<ProductStockLevel | null>(null);
  const [editProduct, setEditProduct] = useState<ProductStockLevel | null>(null);

  // Group and prioritize products
  const prioritizedProducts = prioritizeLowStockProducts(products);

  const outOfStockProducts = prioritizedProducts.filter(
    (p) => getStockStatus(p.current_stock ?? 0, p.reorder_level ?? 0) === 'out_of_stock'
  );

  const lowStockProducts = prioritizedProducts.filter(
    (p) => getStockStatus(p.current_stock ?? 0, p.reorder_level ?? 0) === 'low_stock'
  );

  const displayedProducts =
    filter === 'out_of_stock'
      ? outOfStockProducts
      : filter === 'low_stock'
      ? lowStockProducts
      : prioritizedProducts;

  const formatCurrency = (val: number | null | undefined) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val ?? 0);
  };

  const handleSaved = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/products"
              className="text-xs font-medium text-ink-500 hover:text-accent-600 inline-flex items-center gap-1 transition-colors min-h-[36px]"
            >
              ← Back to all products
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 font-serif">
              Low-Stock & Out-of-Stock Alerts
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-warn-100 text-warn-700 border border-warn-600/30">
              {prioritizedProducts.length} requiring attention
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Products that have reached or fallen below their configured reorder threshold.
          </p>
        </div>

        <div>
          <Link
            href="/dashboard/products"
            className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 bg-white border border-slate-300 text-ink-700 hover:bg-slate-50 rounded-lg font-medium shadow-xs transition-colors text-sm"
          >
            Manage Products
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`min-h-[36px] px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-white text-ink-900 shadow-xs'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          All Alerts ({prioritizedProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('out_of_stock')}
          className={`min-h-[36px] px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            filter === 'out_of_stock'
              ? 'bg-white text-ink-900 shadow-xs'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          Out of Stock ({outOfStockProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('low_stock')}
          className={`min-h-[36px] px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            filter === 'low_stock'
              ? 'bg-white text-ink-900 shadow-xs'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          Low Stock ({lowStockProducts.length})
        </button>
      </div>

      {/* Empty State */}
      {displayedProducts.length === 0 ? (
        <div className="bg-surface border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-good-100 text-good-700 border border-good-600/30 flex items-center justify-center mx-auto text-xl font-serif font-bold">
            ✓
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-ink-900 font-serif">
              {filter === 'out_of_stock'
                ? 'No out-of-stock products'
                : filter === 'low_stock'
                ? 'No low-stock products'
                : 'All products are sufficiently stocked'}
            </h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto">
              {filter === 'all'
                ? 'Great job! None of your active products are currently below their reorder levels.'
                : 'There are currently no items in this filter.'}
            </p>
          </div>
          <Link
            href="/dashboard/products"
            className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            Back to Products Table
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table (>= 640px) */}
          <div className="hidden sm:block overflow-hidden bg-surface border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-surface text-ink-700 font-medium">
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-right">Current Stock</th>
                  <th className="py-3.5 px-4 text-right">Reorder Level</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-ink-900">
                {displayedProducts.map((product) => {
                  const status = getStockStatus(product.current_stock ?? 0, product.reorder_level ?? 0);
                  const isOutOfStock = status === 'out_of_stock';

                  return (
                    <tr
                      key={product.id}
                      onClick={() => setEditProduct(product)}
                      className="cursor-pointer hover:bg-slate-100/60 transition-colors"
                    >
                      <td className="py-4 px-4 font-mono text-xs text-ink-700 font-medium">
                        {product.sku}
                      </td>
                      <td className="py-4 px-4 font-medium text-ink-900">
                        {product.name}
                      </td>
                      <td className="py-4 px-4 text-ink-600">
                        {allCategories.find((c) => c.id === product.category_id)?.name || '-'}
                      </td>
                      <td className="py-4 px-4 text-ink-600">
                        {allSuppliers.find((s) => s.id === product.supplier_id)?.name || '-'}
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-mono font-bold ${
                          isOutOfStock ? 'text-red-600' : 'text-amber-700'
                        }`}
                      >
                        {product.current_stock ?? 0}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-ink-600">
                        {product.reorder_level ?? 0}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            Out of stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warn-100 text-warn-700 border border-warn-600/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-warn-600" />
                            Low stock
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovementProduct(product);
                          }}
                          className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 border border-accent-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          Record movement
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
            {displayedProducts.map((product) => {
              const status = getStockStatus(product.current_stock ?? 0, product.reorder_level ?? 0);
              const isOutOfStock = status === 'out_of_stock';

              return (
                <div
                  key={product.id}
                  onClick={() => setEditProduct(product)}
                  className="bg-surface border border-slate-200 rounded-xl p-4 min-h-[44px] space-y-3 cursor-pointer hover:border-accent-500/50 active:bg-slate-100 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs text-ink-500 block">
                        {product.sku}
                      </span>
                      <h4 className="font-semibold text-ink-900 text-base">
                        {product.name}
                      </h4>
                    </div>
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        Out of stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warn-100 text-warn-700 border border-warn-600/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-warn-600" />
                        Low stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200/60">
                    <div className="text-ink-700">
                      <span className="text-ink-500 text-xs block">Current / Reorder</span>
                      <span
                        className={`font-mono font-bold ${
                          isOutOfStock ? 'text-red-600' : 'text-amber-700'
                        }`}
                      >
                        {product.current_stock ?? 0}
                      </span>
                      <span className="text-ink-400 font-mono text-xs"> / {product.reorder_level ?? 0}</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovementProduct(product);
                        }}
                        className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 border border-accent-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Record movement
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Stock Movement Modal */}
      {movementProduct && (
        <StockMovementModal
          product={movementProduct}
          onClose={() => setMovementProduct(null)}
          onSaved={() => {
            setMovementProduct(null);
            handleSaved();
          }}
        />
      )}

      {/* Edit Product Modal */}
      <ProductModal
        isOpen={Boolean(editProduct)}
        onClose={() => setEditProduct(null)}
        product={editProduct}
        barcodes={editProduct ? barcodes.filter((b) => b.product_id === editProduct.id) : []}
        onSaveSuccess={() => {
          setEditProduct(null);
          handleSaved();
        }}
        categories={activeCategories}
        suppliers={activeSuppliers}
      />
    </div>
  );
}

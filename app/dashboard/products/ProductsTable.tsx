'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductStockLevel, Category, Supplier } from '@/lib/supabase/types';
import { getStockStatus } from '@/lib/stock-alerts';
import ProductModal from './ProductModal';
import StockMovementModal from './StockMovementModal';

interface ProductsTableProps {
  active: ProductStockLevel[];
  archived: ProductStockLevel[];
  /** All categories (active + archived) — used for table column display so archived refs still resolve. */
  allCategories: Category[];
  /** All suppliers (active + archived) — used for table column display so archived refs still resolve. */
  allSuppliers: Supplier[];
  /** Only active categories — passed to the product modal dropdown so archived items can't be selected. */
  activeCategories: Category[];
  /** Only active suppliers — passed to the product modal dropdown so archived items can't be selected. */
  activeSuppliers: Supplier[];
}

type ProductView = 'active' | 'archived';

export default function ProductsTable({ active, archived, allCategories, allSuppliers, activeCategories, activeSuppliers }: ProductsTableProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductStockLevel | null>(null);
  const [movementProduct, setMovementProduct] = useState<ProductStockLevel | null>(null);
  const [view, setView] = useState<ProductView>('active');
  const [restoreLoadingId, setRestoreLoadingId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const products = view === 'active' ? active : archived;

  const handleAddProduct = () => {
    setRestoreError(null);
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: ProductStockLevel) => {
    setRestoreError(null);
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveOrDelete = () => {
    setRestoreError(null);
    router.refresh();
  };

  const handleRestore = async (productId: string) => {
    if (restoreLoadingId) {
      return;
    }

    setRestoreError(null);
    setRestoreLoadingId(productId);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Unable to restore product.');
      }

      router.refresh();
    } catch (error: any) {
      setRestoreError(error?.message ?? 'Unable to restore product.');
    } finally {
      setRestoreLoadingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-900 font-serif">Products</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-50 text-accent-700 border border-accent-100">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Manage your store inventory, stock levels, and pricing.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="inline-flex items-center p-1 bg-slate-100/80 rounded-full border border-slate-200/80 text-xs sm:text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setView('active');
                setRestoreError(null);
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
                view === 'active'
                  ? 'bg-accent-50 text-accent-700 font-semibold border border-accent-100 shadow-2xs'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => {
                setView('archived');
                setRestoreError(null);
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
                view === 'archived'
                  ? 'bg-accent-50 text-accent-700 font-semibold border border-accent-100 shadow-2xs'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              Archived
            </button>
          </div>

          {view === 'active' ? (
            <div className="flex items-center gap-2">
              {active.some((p) => (p.current_stock ?? 0) <= (p.reorder_level ?? 0)) && (
                <Link
                  href="/dashboard/products/low-stock"
                  className="min-h-[44px] px-3.5 py-2 inline-flex items-center justify-center gap-1.5 bg-warn-50 hover:bg-warn-100 text-warn-700 border border-warn-600/30 rounded-lg font-medium transition-colors text-sm"
                >
                  <span>⚠️</span>
                  <span>
                    {active.filter((p) => (p.current_stock ?? 0) <= (p.reorder_level ?? 0)).length} Alerts
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleAddProduct}
                className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
              >
                <span className="text-lg leading-none">+</span> Add product
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {restoreError ? (
        <div className="p-3 text-sm text-warn-700 bg-warn-100 border border-warn-600/30 rounded-lg">
          {restoreError}
        </div>
      ) : null}

      {/* Empty State */}
      {products.length === 0 ? (
        <div className="bg-surface border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-500 border border-accent-100 flex items-center justify-center mx-auto text-xl font-serif font-bold">
            P
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-ink-900 font-serif">
              {view === 'active' ? 'No products found' : 'No archived products'}
            </h3>
            {view === 'active' ? (
              <p className="text-sm text-ink-500 max-w-sm mx-auto">
                Your inventory is empty. Start adding products to track stock levels and prices.
              </p>
            ) : (
              <p className="text-sm text-ink-500 max-w-sm mx-auto">
                Archived products will appear here and can be restored when needed.
              </p>
            )}
          </div>
          {view === 'active' ? (
            <button
              type="button"
              onClick={handleAddProduct}
              className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
            >
              <span className="text-lg leading-none">+</span> Add product
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Desktop Table (screens >= 640px) */}
          <div className="hidden sm:block overflow-hidden bg-surface border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-surface text-ink-700 font-medium">
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-right">Stock</th>
                  <th className="py-3.5 px-4 text-right">Sell price</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-ink-900">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={view === 'active' ? () => handleEditProduct(product) : undefined}
                    className={
                      view === 'active'
                        ? 'cursor-pointer hover:bg-slate-100/60 transition-colors'
                        : 'transition-colors'
                    }
                  >
                    <td className="py-4 px-4 font-mono text-xs text-ink-700 font-medium">
                      {product.sku}
                    </td>
                    <td className="py-4 px-4 font-medium text-ink-900">
                      {product.name}
                    </td>
                    <td className="py-4 px-4 text-ink-600">
                      {/* Use allCategories so existing products with archived categories still display the name */}
                      {allCategories.find(c => c.id === product.category_id)?.name || '-'}
                    </td>
                    <td className="py-4 px-4 text-ink-600">
                      {/* Use allSuppliers so existing products with archived suppliers still display the name */}
                      {allSuppliers.find(s => s.id === product.supplier_id)?.name || '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      {product.current_stock ?? 0} {product.stock_unit || 'unit'}s
                      {product.package_unit && product.units_per_package && (
                        <div className="text-xs text-ink-500 font-sans mt-0.5">
                          1 {product.package_unit} = {product.units_per_package} {product.stock_unit || 'unit'}s
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-medium">
                      {formatCurrency(product.sell_price)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const status = getStockStatus(product.current_stock ?? 0, product.reorder_level ?? 0);
                        if (status === 'out_of_stock') {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              Out of stock
                            </span>
                          );
                        }
                        if (status === 'low_stock') {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warn-100 text-warn-700 border border-warn-600/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-warn-600" />
                              Low stock
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-good-100 text-good-700 border border-good-600/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-good-600" />
                            In stock
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {view === 'active' ? (
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
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(product.id)}
                          disabled={restoreLoadingId === product.id}
                          className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-good-700 bg-good-100 hover:bg-good-200 border border-good-600/30 rounded-lg transition-colors inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {restoreLoadingId === product.id ? 'Restoring...' : 'Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked Card Layout (screens < 640px) */}
          <div className="block sm:hidden space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={view === 'active' ? () => handleEditProduct(product) : undefined}
                className={`bg-surface border border-slate-200 rounded-xl p-4 min-h-[44px] space-y-3 ${
                  view === 'active'
                    ? 'cursor-pointer hover:border-accent-500/50 active:bg-slate-100 transition-all'
                    : ''
                }`}
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
                  {(() => {
                    const status = getStockStatus(product.current_stock ?? 0, product.reorder_level ?? 0);
                    if (status === 'out_of_stock') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          Out of stock
                        </span>
                      );
                    }
                    if (status === 'low_stock') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warn-100 text-warn-700 border border-warn-600/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-warn-600" />
                          Low stock
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-good-100 text-good-700 border border-good-600/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-good-600" />
                        In stock
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200/60">
                  <div className="text-ink-700">
                    <span className="text-ink-500 text-xs block">Stock</span>
                    <span className="font-mono font-medium">{product.current_stock ?? 0} {product.stock_unit || 'unit'}s</span>
                    {product.package_unit && product.units_per_package && (
                      <span className="text-ink-500 text-xs block mt-0.5">
                        1 {product.package_unit} = {product.units_per_package} {product.stock_unit || 'unit'}s
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-ink-500 text-xs block">Sell Price</span>
                      <span className="font-semibold text-ink-900">
                        {formatCurrency(product.sell_price)}
                      </span>
                    </div>
                    {view === 'active' ? (
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
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(product.id);
                        }}
                        disabled={restoreLoadingId === product.id}
                        className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-good-700 bg-good-100 hover:bg-good-200 border border-good-600/30 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {restoreLoadingId === product.id ? 'Restoring...' : 'Restore'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Product Modal: receives only ACTIVE categories/suppliers for selectors */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
        onSaveSuccess={handleSaveOrDelete}
        categories={activeCategories}
        suppliers={activeSuppliers}
      />

      {/* Stock Movement Modal */}
      {view === 'active' && movementProduct && (
        <StockMovementModal
          product={movementProduct}
          onClose={() => setMovementProduct(null)}
          onSaved={() => {
            handleSaveOrDelete();
          }}
        />
      )}
    </div>
  );
}

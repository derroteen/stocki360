'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStockLevel } from '@/lib/supabase/types';
import ProductModal from './ProductModal';

interface ProductsTableProps {
  initial: ProductStockLevel[];
}

export default function ProductsTable({ initial }: ProductsTableProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductStockLevel | null>(null);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: ProductStockLevel) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveOrDelete = () => {
    router.refresh();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
              {initial.length} {initial.length === 1 ? 'product' : 'products'}
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Manage your store inventory, stock levels, and pricing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddProduct}
          className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
        >
          <span className="text-lg leading-none">+</span> Add product
        </button>
      </div>

      {/* Empty State */}
      {initial.length === 0 ? (
        <div className="bg-surface border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-500 border border-accent-100 flex items-center justify-center mx-auto text-xl font-serif font-bold">
            P
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-ink-900 font-serif">No products found</h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto">
              Your inventory is empty. Start adding products to track stock levels and prices.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddProduct}
            className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <span className="text-lg leading-none">+</span> Add product
          </button>
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
                  <th className="py-3.5 px-4 text-right">Stock</th>
                  <th className="py-3.5 px-4 text-right">Sell price</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-ink-900">
                {initial.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => handleEditProduct(product)}
                    className="cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono text-xs text-ink-700 font-medium">
                      {product.sku}
                    </td>
                    <td className="py-4 px-4 font-medium text-ink-900">
                      {product.name}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      {product.current_stock ?? 0}
                    </td>
                    <td className="py-4 px-4 text-right font-medium">
                      {formatCurrency(product.sell_price)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {product.is_low_stock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warn-100 text-warn-700 border border-warn-600/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-warn-600" />
                          Low stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-good-100 text-good-700 border border-good-600/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-good-600" />
                          In stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked Card Layout (screens < 640px) */}
          <div className="block sm:hidden space-y-3">
            {initial.map((product) => (
              <div
                key={product.id}
                onClick={() => handleEditProduct(product)}
                className="bg-surface border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-accent-500/50 active:bg-slate-100 transition-all min-h-[44px] space-y-3"
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
                  {product.is_low_stock ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warn-100 text-warn-700 border border-warn-600/30">
                      Low stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-good-100 text-good-700 border border-good-600/30">
                      In stock
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200/60">
                  <div className="text-ink-700">
                    <span className="text-ink-500 text-xs block">Stock</span>
                    <span className="font-mono font-medium">{product.current_stock ?? 0}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-ink-500 text-xs block">Sell Price</span>
                    <span className="font-semibold text-ink-900">
                      {formatCurrency(product.sell_price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Product Modal for Create / Edit */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
        onSaveSuccess={handleSaveOrDelete}
      />
    </div>
  );
}

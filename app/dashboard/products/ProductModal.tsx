'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStockLevel } from '@/lib/supabase/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductStockLevel | null;
  onSaveSuccess?: () => void;
}

export default function ProductModal({
  isOpen,
  onClose,
  product = null,
  onSaveSuccess,
}: ProductModalProps) {
  const router = useRouter();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(product);

  useEffect(() => {
    if (product) {
      setSku(product.sku || '');
      setName(product.name || '');
      setCostPrice(product.cost_price != null ? String(product.cost_price) : '');
      setSellPrice(product.sell_price != null ? String(product.sell_price) : '');
      setReorderLevel(product.reorder_level != null ? String(product.reorder_level) : '');
    } else {
      setSku('');
      setName('');
      setCostPrice('');
      setSellPrice('');
      setReorderLevel('');
    }
    setError(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const payload = {
        sku,
        name,
        cost_price: parseFloat(costPrice) || 0,
        sell_price: parseFloat(sellPrice) || 0,
        reorder_level: parseInt(reorderLevel, 10) || 0,
      };

      if (isEdit && product?.id) {
        const { error: updateErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('products')
          .insert([payload]);
        if (insertErr) throw insertErr;
      }

      router.refresh();
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product?.id) return;
    if (!confirm('Are you sure you want to delete this product?')) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: deleteErr } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
      if (deleteErr) throw deleteErr;

      router.refresh();
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-cream-50 border border-cream-200 rounded-xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-cream-200 pb-4">
          <h2 className="text-xl font-bold text-ink-900 font-serif">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-500 hover:text-ink-900 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 text-sm text-warn-700 bg-warn-100 border border-warn-600/30 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              SKU
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-cream-100 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="e.g. PRD-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-cream-100 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="Product Name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Cost Price
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-cream-100 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Sell Price
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-cream-100 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                required
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-cream-100 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-cream-200">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-warn-700 bg-warn-100 hover:bg-warn-600 hover:text-white rounded-lg transition-colors mr-auto"
              >
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-700 bg-cream-200 hover:bg-cream-100 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors shadow-sm"
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

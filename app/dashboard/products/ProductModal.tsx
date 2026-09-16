'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStockLevel, Category, Supplier, ProductBarcode } from '@/lib/supabase/types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductStockLevel | null;
  /** Existing barcodes for this product; empty for a new product. */
  barcodes: ProductBarcode[];
  onSaveSuccess?: () => void;
  categories: Category[];
  suppliers: Supplier[];
}

interface BarcodeFormRow {
  id?: string;
  barcode: string;
  entryMode: 'individual' | 'package';
  label: string;
}

const emptyBarcodeRow = (): BarcodeFormRow => ({ barcode: '', entryMode: 'individual', label: '' });

export default function ProductModal({
  isOpen,
  onClose,
  product = null,
  barcodes,
  onSaveSuccess,
  categories = [],
  suppliers = [],
}: ProductModalProps) {
  const router = useRouter();
  const [sku, setSku] = useState('');
  const [barcodeRows, setBarcodeRows] = useState<BarcodeFormRow[]>([]);
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [stockUnit, setStockUnit] = useState('unit');
  const [packageUnit, setPackageUnit] = useState('');
  const [unitsPerPackage, setUnitsPerPackage] = useState('');
  const [packageCostPrice, setPackageCostPrice] = useState('');
  const [packageSellPrice, setPackageSellPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(product);
  const hasPackaging = Boolean(packageUnit && unitsPerPackage && Number(unitsPerPackage) > 0);
  const unitLabel = stockUnit.trim() || 'unit';

  useEffect(() => {
    if (product) {
      setSku(product.sku || '');
      setName(product.name || '');
      setCostPrice(product.cost_price != null ? String(product.cost_price) : '');
      setSellPrice(product.sell_price != null ? String(product.sell_price) : '');
      setReorderLevel(product.reorder_level != null ? String(product.reorder_level) : '');
      setCategoryId(product.category_id || '');
      setSupplierId(product.supplier_id || '');
      setStockUnit(product.stock_unit || 'unit');
      setPackageUnit(product.package_unit || '');
      setUnitsPerPackage(product.units_per_package != null ? String(product.units_per_package) : '');
      setPackageCostPrice(product.package_cost_price != null ? String(product.package_cost_price) : '');
      setPackageSellPrice(product.package_sell_price != null ? String(product.package_sell_price) : '');
      setBarcodeRows(
        barcodes.map((b) => ({
          id: b.id,
          barcode: b.barcode,
          entryMode: b.entry_mode,
          label: b.label || '',
        }))
      );
    } else {
      setSku('');
      setName('');
      setCostPrice('');
      setSellPrice('');
      setReorderLevel('');
      setCategoryId('');
      setSupplierId('');
      setStockUnit('unit');
      setPackageUnit('');
      setUnitsPerPackage('');
      setPackageCostPrice('');
      setPackageSellPrice('');
      setBarcodeRows([]);
    }
    setError(null);
    // Only reset when the product being edited changes or the modal opens —
    // `barcodes` is snapshotted here deliberately, not tracked live, since
    // the parent recomputes it on every render and it would otherwise wipe
    // in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleAddBarcodeRow = () => {
    setBarcodeRows((prev) => [...prev, emptyBarcodeRow()]);
  };

  const handleRemoveBarcodeRow = (index: number) => {
    setBarcodeRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBarcodeRowChange = (
    index: number,
    field: 'barcode' | 'entryMode' | 'label',
    value: string
  ) => {
    setBarcodeRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as BarcodeFormRow;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Send raw form values so the API remains the single source of truth for validation.
      const payload = {
        sku,
        name,
        cost_price: costPrice,
        sell_price: sellPrice,
        reorder_level: reorderLevel,
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        stock_unit: stockUnit,
        package_unit: packageUnit || null,
        units_per_package: unitsPerPackage || null,
        package_cost_price: packageCostPrice || null,
        package_sell_price: packageSellPrice || null,
        barcodes: barcodeRows
          .map((row) => ({
            barcode: row.barcode.trim(),
            entry_mode: row.entryMode,
            label: row.label.trim() || null,
          }))
          .filter((row) => row.barcode.length > 0),
      };

      const endpoint = isEdit && product?.id ? `/api/products/${product.id}` : '/api/products';
      const method = isEdit && product?.id ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'An error occurred while saving the product');
      } else {
        router.refresh();
        if (onSaveSuccess) onSaveSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product?.id) return;
    if (!confirm('Are you sure you want to archive this product?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'An error occurred while archiving the product');
      }

      router.refresh();
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while archiving the product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 sm:px-8 pt-6 sm:pt-8 pb-4 shrink-0">
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-warn-700 bg-warn-100 border border-warn-600/30 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              SKU
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="e.g. PRD-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Barcodes <span className="text-ink-500 font-normal">(optional)</span>
            </label>

            {!hasPackaging && (
              <p className="text-xs text-ink-500 mb-2">
                Set a bulk package below to enable package barcodes.
              </p>
            )}

            {barcodeRows.length > 0 && (
              <div className="space-y-2 mb-2">
                {barcodeRows.map((row, index) => (
                  <div key={row.id ?? `new-${index}`} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={row.barcode}
                      onChange={(e) => handleBarcodeRowChange(index, 'barcode', e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      placeholder="e.g. 6009123456789"
                    />
                    <select
                      value={row.entryMode}
                      onChange={(e) => handleBarcodeRowChange(index, 'entryMode', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 sm:w-44 shrink-0"
                    >
                      <option value="individual">Sells as: Unit</option>
                      <option value="package" disabled={!hasPackaging}>
                        Sells as: Package
                      </option>
                    </select>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => handleBarcodeRowChange(index, 'label', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 sm:w-32 shrink-0"
                      placeholder="Label (optional)"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBarcodeRow(index)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-500 hover:text-warn-700 transition-colors shrink-0 self-end sm:self-auto"
                      aria-label="Remove barcode"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleAddBarcodeRow}
              className="min-h-[44px] px-3 py-2 text-sm font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 border border-accent-100 rounded-lg transition-colors"
            >
              + Add barcode
            </button>
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="Product Name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">No Supplier</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Cost Price (per {unitLabel})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Sell Price (per {unitLabel})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Stock/Sale Unit
              </label>
              <input
                type="text"
                required
                value={stockUnit}
                onChange={(e) => setStockUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="e.g. packet, piece, bottle"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Bulk Package <span className="text-ink-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={packageUnit}
                onChange={(e) => setPackageUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="e.g. bale, carton"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Units per package
              </label>
              <input
                type="number"
                min="1"
                required={!!packageUnit}
                value={unitsPerPackage}
                onChange={(e) => setUnitsPerPackage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder={packageUnit ? "e.g. 20" : ""}
                disabled={!packageUnit}
              />
            </div>
          </div>
          
          {packageUnit && unitsPerPackage && (
            <p className="text-sm text-ink-600 bg-slate-50 p-2 rounded border border-slate-100">
              Conversion: <strong>1 {packageUnit} = {unitsPerPackage} {stockUnit}s</strong>
            </p>
          )}

          {hasPackaging && (
            <div className="border-t border-slate-200 pt-4 mt-4 space-y-4">
              <h3 className="text-sm font-semibold text-ink-900">
                Bulk package pricing <span className="text-ink-500 font-normal">(optional)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">
                    Cost Price (per {packageUnit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packageCostPrice}
                    onChange={(e) => setPackageCostPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">
                    Sell Price (per {packageUnit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packageSellPrice}
                    onChange={(e) => setPackageSellPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              {packageSellPrice &&
                Number(unitsPerPackage) > 0 &&
                !isNaN(parseFloat(packageSellPrice)) && (
                  <p className="text-sm text-ink-600 bg-slate-50 p-2 rounded border border-slate-100">
                    Works out to Ksh{' '}
                    {(parseFloat(packageSellPrice) / Number(unitsPerPackage)).toLocaleString('en-KE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    per {unitLabel}
                  </p>
                )}
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 sm:px-8 py-4 shrink-0">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-warn-700 bg-warn-100 hover:bg-warn-600 hover:text-white rounded-lg transition-colors mr-auto"
            >
              Archive
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors shadow-sm"
          >
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

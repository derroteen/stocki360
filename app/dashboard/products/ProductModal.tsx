'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProductStockLevel, Category, Supplier, ProductBarcode } from '@/lib/supabase/types';
import FormField from '@/components/forms/FormField';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { clearValidFieldError, focusFirstInvalid, validateFields, type FieldRule, type FormErrors } from '@/components/forms/validation';

const FIELD_LABELS: Record<string, string> = {
  'product-code': 'Product code',
  'product-name': 'Name',
  'cost-price': 'Cost price',
  'sell-price': 'Selling price',
  'reorder-level': 'Reorder level',
  'stock-unit': 'Stock/sale unit',
  'units-per-package': 'Units per package',
  'package-cost-price': 'Package cost price',
  'package-sell-price': 'Package sell price',
};

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
  if (!isOpen) return null;

  return (
    <ProductModalForm
      key={product?.id ?? 'new'}
      onClose={onClose}
      product={product}
      barcodes={barcodes}
      onSaveSuccess={onSaveSuccess}
      categories={categories}
      suppliers={suppliers}
    />
  );
}

function ProductModalForm({
  onClose,
  product = null,
  barcodes,
  onSaveSuccess,
  categories = [],
  suppliers = [],
}: Omit<ProductModalProps, 'isOpen'>) {
  const router = useRouter();
  const skuHelpRef = useRef<HTMLDivElement>(null);
  const skuHelpButtonRef = useRef<HTMLButtonElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [sku, setSku] = useState(product?.sku || '');
  const [isSkuHelpOpen, setIsSkuHelpOpen] = useState(false);
  const [barcodeRows, setBarcodeRows] = useState<BarcodeFormRow[]>(
    product
      ? barcodes.map((barcode) => ({
          id: barcode.id,
          barcode: barcode.barcode,
          entryMode: barcode.entry_mode,
          label: barcode.label || '',
        }))
      : [],
  );
  const [name, setName] = useState(product?.name || '');
  const [costPrice, setCostPrice] = useState(
    product?.cost_price != null ? String(product.cost_price) : '',
  );
  const [sellPrice, setSellPrice] = useState(
    product?.sell_price != null ? String(product.sell_price) : '',
  );
  const [reorderLevel, setReorderLevel] = useState(
    product?.reorder_level != null ? String(product.reorder_level) : '',
  );
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [supplierId, setSupplierId] = useState(product?.supplier_id || '');
  const [stockUnit, setStockUnit] = useState(product?.stock_unit || 'unit');
  const [packageUnit, setPackageUnit] = useState(product?.package_unit || '');
  const [unitsPerPackage, setUnitsPerPackage] = useState(
    product?.units_per_package != null ? String(product.units_per_package) : '',
  );
  const [packageCostPrice, setPackageCostPrice] = useState(
    product?.package_cost_price != null ? String(product.package_cost_price) : '',
  );
  const [packageSellPrice, setPackageSellPrice] = useState(
    product?.package_sell_price != null ? String(product.package_sell_price) : '',
  );
  const [loading, setLoading] = useState(false);
  const [suggestingSku, setSuggestingSku] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const isEdit = Boolean(product);
  const hasPackaging = Boolean(packageUnit && unitsPerPackage && Number(unitsPerPackage) > 0);
  const unitLabel = stockUnit.trim() || 'unit';

  const updateField = (
    id: string,
    label: string,
    value: string,
    setter: (value: string) => void,
    validation: Omit<FieldRule, 'id' | 'label' | 'value'> = {},
  ) => {
    setter(value);
    setFieldErrors((current) =>
      clearValidFieldError(current, id, { id, label, value, ...validation }),
    );
    setError(null);
  };

  useEffect(() => {
    if (!isSkuHelpOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !skuHelpRef.current?.contains(event.target)) {
        setIsSkuHelpOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSkuHelpOpen(false);
        skuHelpButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSkuHelpOpen]);

  const handleSuggestSku = async () => {
    if (sku.trim() && !window.confirm('Replace the current product code with a suggested code?')) {
      return;
    }

    const words = name.match(/[a-z]+/gi) ?? [];
    const codeParts = words.slice(0, 2).map((word) => word.slice(0, 3).toUpperCase());
    const number = name.match(/\d+/)?.[0];
    const baseCode = [...(codeParts.length > 0 ? codeParts : ['ITEM']), ...(number ? [number] : [])].join('-');

    setSuggestingSku(true);
    setError(null);
    try {
      const response = await fetch(`/api/products?sku-prefix=${encodeURIComponent(baseCode)}`);
      const body = (await response.json().catch(() => null)) as { skus?: string[]; error?: string } | null;
      if (!response.ok || !body || !Array.isArray(body.skus)) {
        throw new Error(body?.error ?? 'Unable to check existing product codes. Please try again.');
      }

      const existingCodes = new Set(body.skus.map((existingCode) => existingCode.toUpperCase()));
      let suggestedCode = baseCode;
      let suffix = 2;
      while (existingCodes.has(suggestedCode)) {
        suggestedCode = `${baseCode}-${suffix}`;
        suffix += 1;
      }
      setSku(suggestedCode);
      setFieldErrors((current) => {
        const next = { ...current };
        delete next['product-code'];
        return next;
      });
    } catch (suggestionError) {
      setError(
        suggestionError instanceof Error
          ? suggestionError.message
          : 'Unable to check existing product codes. Please try again.',
      );
    } finally {
      setSuggestingSku(false);
    }
  };

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
    if (loading) return;
    const errors = validateFields([
      { id: 'product-code', label: 'Product code', value: sku, required: true },
      { id: 'product-name', label: 'Name', value: name, required: true },
      { id: 'cost-price', label: 'Cost price', value: costPrice, required: true, min: 0 },
      { id: 'sell-price', label: 'Selling price', value: sellPrice, required: true, min: 0 },
      { id: 'reorder-level', label: 'Reorder level', value: reorderLevel, required: true, min: 0, wholeNumber: true },
      { id: 'stock-unit', label: 'Stock/sale unit', value: stockUnit, required: true },
      ...(packageUnit ? [{ id: 'units-per-package', label: 'Units per package', value: unitsPerPackage, required: true, min: 1, wholeNumber: true }] : []),
      ...(packageCostPrice ? [{ id: 'package-cost-price', label: 'Package cost price', value: packageCostPrice, min: 0 }] : []),
      ...(packageSellPrice ? [{ id: 'package-sell-price', label: 'Package sell price', value: packageSellPrice, min: 0 }] : []),
    ]);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(errors);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Send raw form values so the API remains the single source of truth for validation.
      const payload = {
        sku: sku.trim(),
        name: name.trim(),
        cost_price: costPrice,
        sell_price: sellPrice,
        reorder_level: reorderLevel,
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        stock_unit: stockUnit.trim(),
        package_unit: packageUnit.trim() || null,
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
        const body = (await response.json().catch(() => null)) as { error?: string; code?: string } | null;
        if (body?.code === 'PRODUCT_SKU_CONFLICT') {
          const message = 'That product code is already used. Try a different one or tap Suggest a code.';
          setFieldErrors({ 'product-code': message });
          focusFirstInvalid({ 'product-code': message });
          return;
        }
        throw new Error(body?.error ?? 'An error occurred while saving the product');
      } else {
        router.refresh();
        if (onSaveSuccess) onSaveSuccess();
        onClose();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred while saving the product';
      setError(message);
      window.setTimeout(() => errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while archiving the product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-panel border border-line rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh]">
        <div className="flex items-center justify-between border-b border-line px-6 sm:px-8 pt-6 sm:pt-8 pb-4 shrink-0">
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

        <form id="product-form" noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-4">
          <FormField
            id="product-code"
            label="Product code (SKU)"
            required
            hint="A short code you choose to identify this product, for example PVC-20 or RICE-5KG. Each product needs its own code."
            error={fieldErrors['product-code']}
            labelAddon={(
              <div className="relative" ref={skuHelpRef}>
                <button
                  ref={skuHelpButtonRef}
                  type="button"
                  aria-label="What does SKU mean?"
                  aria-expanded={isSkuHelpOpen}
                  aria-controls="product-code-help"
                  aria-describedby={isSkuHelpOpen ? 'product-code-help' : undefined}
                  onClick={() => setIsSkuHelpOpen((open) => !open)}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-sm font-semibold text-ink-600 hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  ?
                </button>
                {isSkuHelpOpen && (
                  <div
                    id="product-code-help"
                    role="tooltip"
                    className="absolute left-0 top-full z-20 mt-1 w-[min(18rem,calc(100vw-4rem))] rounded-lg border border-line bg-card p-3 text-xs leading-5 text-ink-700 shadow-lg"
                  >
                    SKU means Stock Keeping Unit. It is your own shop code, used to find the product quickly in sales and reports. It is different from the barcode, which the manufacturer prints on the pack.
                  </div>
                )}
              </div>
            )}
          >
            {(controlProps) => (
              <div className="flex flex-col gap-2 sm:flex-row">
              <input
                {...controlProps}
                type="text"
                value={sku}
                onChange={(e) => updateField('product-code', 'Product code', e.target.value, setSku, { required: true })}
                className="w-full min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="e.g. PRD-001"
              />
              <button
                type="button"
                onClick={handleSuggestSku}
                disabled={suggestingSku || loading}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink-700 hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-60"
              >
                {suggestingSku ? 'Checking…' : 'Suggest a code'}
              </button>
              </div>
            )}
          </FormField>

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
                      className="flex-1 min-w-0 px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      placeholder="e.g. 6009123456789"
                    />
                    <select
                      value={row.entryMode}
                      onChange={(e) => handleBarcodeRowChange(index, 'entryMode', e.target.value)}
                      className="px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 sm:w-44 shrink-0"
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
                      className="px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 sm:w-32 shrink-0"
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
              className="min-h-[44px] px-3 py-2 text-sm font-medium text-accent-text bg-accent-50 hover:bg-accent-100 border border-accent-100 rounded-lg transition-colors"
            >
              + Add barcode
            </button>
          </div>

          <FormField id="product-name" label="Name" required error={fieldErrors['product-name']}>
            <input
              type="text"
              value={name}
              onChange={(e) => updateField('product-name', 'Name', e.target.value, setName, { required: true })}
              className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="Product Name"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="mt-1 text-xs text-ink-500">
                  Categories are optional.{' '}
                  <Link
                    href="/dashboard/categories"
                    className="inline-flex min-h-[44px] items-center font-semibold text-accent-text underline underline-offset-2"
                  >
                    Create a category
                  </Link>
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">No Supplier</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="mt-1 text-xs text-ink-500">
                  Suppliers are optional.{' '}
                  <Link
                    href="/dashboard/suppliers"
                    className="inline-flex min-h-[44px] items-center font-semibold text-accent-text underline underline-offset-2"
                  >
                    Add a supplier
                  </Link>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField id="cost-price" label={`Cost Price (per ${unitLabel})`} required error={fieldErrors['cost-price']}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => updateField('cost-price', 'Cost price', e.target.value, setCostPrice, { required: true, min: 0 })}
                className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </FormField>

            <FormField id="sell-price" label={`Sell Price (per ${unitLabel})`} required error={fieldErrors['sell-price']}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellPrice}
                onChange={(e) => updateField('sell-price', 'Selling price', e.target.value, setSellPrice, { required: true, min: 0 })}
                className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </FormField>

            <FormField id="reorder-level" label="Reorder Level" required error={fieldErrors['reorder-level']}>
              <input
                type="number"
                value={reorderLevel}
                onChange={(e) => updateField('reorder-level', 'Reorder level', e.target.value, setReorderLevel, { required: true, min: 0, wholeNumber: true })}
                className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-line pt-4 mt-4">
            <FormField id="stock-unit" label="Stock/Sale Unit" required error={fieldErrors['stock-unit']}>
              <input
                type="text"
                value={stockUnit}
                onChange={(e) => updateField('stock-unit', 'Stock/sale unit', e.target.value, setStockUnit, { required: true })}
                className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="e.g. packet, piece, bottle"
              />
            </FormField>
            
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Bulk Package <span className="text-ink-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={packageUnit}
                onChange={(e) => {
                  const value = e.target.value;
                  setPackageUnit(value);
                  if (!value.trim()) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next['units-per-package'];
                      delete next['package-cost-price'];
                      delete next['package-sell-price'];
                      return next;
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="e.g. bale, carton"
              />
            </div>

            <FormField id="units-per-package" label="Units per package" required={!!packageUnit} error={fieldErrors['units-per-package']}>
              <input
                type="number"
                min="1"
                value={unitsPerPackage}
                onChange={(e) => updateField('units-per-package', 'Units per package', e.target.value, setUnitsPerPackage, { required: !!packageUnit, min: 1, wholeNumber: true })}
                className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder={packageUnit ? "e.g. 20" : ""}
                disabled={!packageUnit}
              />
            </FormField>
          </div>
          
          {packageUnit && unitsPerPackage && (
            <p className="text-sm text-ink-600 bg-subtle p-2 rounded border border-line-subtle">
              Conversion: <strong>1 {packageUnit} = {unitsPerPackage} {stockUnit}s</strong>
            </p>
          )}

          {hasPackaging && (
            <div className="border-t border-line pt-4 mt-4 space-y-4">
              <h3 className="text-sm font-semibold text-ink-900">
                Bulk package pricing <span className="text-ink-500 font-normal">(optional)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="package-cost-price" label={`Cost Price (per ${packageUnit})`} error={fieldErrors['package-cost-price']}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packageCostPrice}
                    onChange={(e) => updateField('package-cost-price', 'Package cost price', e.target.value, setPackageCostPrice, { min: 0 })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </FormField>

                <FormField id="package-sell-price" label={`Sell Price (per ${packageUnit})`} error={fieldErrors['package-sell-price']}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packageSellPrice}
                    onChange={(e) => updateField('package-sell-price', 'Package sell price', e.target.value, setPackageSellPrice, { min: 0 })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </FormField>
              </div>

              {packageSellPrice &&
                Number(unitsPerPackage) > 0 &&
                !isNaN(parseFloat(packageSellPrice)) && (
                  <p className="text-sm text-ink-600 bg-subtle p-2 rounded border border-line-subtle">
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

        <div ref={errorSummaryRef} className="sticky bottom-0 z-10 shrink-0 border-t border-line bg-panel px-6 py-4 sm:px-8">
          <FormErrorSummary errors={fieldErrors} labels={FIELD_LABELS} serverError={error} />
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-700 bg-subtle-strong hover:bg-subtle-active rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="product-form"
            disabled={loading}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors shadow-sm"
          >
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

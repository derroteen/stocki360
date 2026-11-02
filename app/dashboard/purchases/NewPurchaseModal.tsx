'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Supplier, ProductStockLevel, CreatePurchaseItemPayload } from '@/lib/supabase/types';
import FormField from '@/components/forms/FormField';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { clearValidFieldError, focusFirstInvalid, validateFields, type FieldRule, type FormErrors } from '@/components/forms/validation';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: ProductStockLevel[];
  onSuccess: () => void;
}

interface FormItem {
  productId: string;
  entryMode: 'individual' | 'package';
  quantity: string;
  unitCost: string;
  packageQuantity: string;
  packageUnitCost: string;
}

const emptyItem = (): FormItem => ({
  productId: '',
  entryMode: 'individual',
  quantity: '1',
  unitCost: '',
  packageQuantity: '1',
  packageUnitCost: '',
});

export default function NewPurchaseModal({
  isOpen,
  onClose,
  suppliers,
  products,
  onSuccess,
}: NewPurchaseModalProps) {
  if (!isOpen) return null;

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="purchase-no-products-title"
          className="w-full max-w-md rounded-xl border border-line bg-panel p-5 shadow-xl sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="purchase-no-products-title" className="text-lg font-bold font-serif text-ink-900">
                Add a product first
              </h2>
              <p className="mt-2 text-sm text-ink-600">
                Purchases add stock to products, so create at least one product before recording a purchase.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close purchase dialog"
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-subtle-strong hover:text-ink-900"
            >
              ✕
            </button>
          </div>
          <Link
            href="/dashboard/products"
            onClick={onClose}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700"
          >
            Go to Products
          </Link>
        </section>
      </div>
    );
  }

  return (
    <NewPurchaseForm
      key="new"
      onClose={onClose}
      suppliers={suppliers}
      products={products}
      onSuccess={onSuccess}
    />
  );
}

function NewPurchaseForm({
  onClose,
  suppliers,
  products,
  onSuccess,
}: Omit<NewPurchaseModalProps, 'isOpen'>) {
  const [supplierId, setSupplierId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const submittingRef = useRef(false);

  const getProduct = (productId: string) => products.find((p) => p.id === productId) || null;

  const productHasPackaging = (productId: string) => {
    const prod = getProduct(productId);
    return Boolean(prod?.package_unit && prod?.units_per_package);
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const selectedProd = getProduct(newProductId);
    setFieldErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => !id.startsWith(`purchase-item-${index}-`))),
    );
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: newProductId,
        entryMode: 'individual',
        packageQuantity: '1',
        packageUnitCost: '',
        unitCost:
          updated[index].unitCost ||
          (selectedProd?.cost_price != null ? String(selectedProd.cost_price) : ''),
      };
      return updated;
    });
  };

  const handleEntryModeChange = (index: number, mode: 'individual' | 'package') => {
    setFieldErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => !id.startsWith(`purchase-item-${index}-`))),
    );
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        entryMode: mode,
        ...(mode === 'individual'
          ? { packageQuantity: '1', packageUnitCost: '' }
          : { quantity: '1', unitCost: '' }),
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: val };
      return updated;
    });
  };

  const handleUnitCostChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unitCost: val };
      return updated;
    });
  };

  const handlePackageQuantityChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], packageQuantity: val };
      return updated;
    });
  };

  const handlePackageUnitCostChange = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], packageUnitCost: val };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => !id.startsWith('purchase-item-'))),
    );
  };

  const lineTotals = items.map((item) => {
    if (item.entryMode === 'package') {
      const q = Math.max(0, parseInt(item.packageQuantity, 10) || 0);
      const c = Math.max(0, parseFloat(item.packageUnitCost) || 0);
      return q * c;
    }
    const q = Math.max(0, parseInt(item.quantity, 10) || 0);
    const c = Math.max(0, parseFloat(item.unitCost) || 0);
    return q * c;
  });

  const grandTotal = lineTotals.reduce((sum, val) => sum + val, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const fieldLabels: Record<string, string> = {
    'purchase-date': 'Purchase date',
    ...Object.fromEntries(items.flatMap((_, index) => [
      [`purchase-item-${index}-product`, `Item ${index + 1} product`],
      [`purchase-item-${index}-quantity`, `Item ${index + 1} quantity`],
      [`purchase-item-${index}-cost`, `Item ${index + 1} unit cost`],
      [`purchase-item-${index}-package-quantity`, `Item ${index + 1} package quantity`],
      [`purchase-item-${index}-package-cost`, `Item ${index + 1} package cost`],
    ])),
  };

  const validatePurchaseForm = (): FormErrors => {
    const errors = validateFields([
      { id: 'purchase-date', label: 'Purchase date', value: purchaseDate, required: true },
    ]);
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const productId = `purchase-item-${index}-product`;
      if (!item.productId) {
        errors[productId] = `Item ${index + 1} product is required`;
      } else if (seen.has(item.productId)) {
        errors[productId] = 'Choose a different product or combine its quantity into one line';
      }
      seen.add(item.productId);
      if (item.entryMode === 'package') {
        if (item.productId && !productHasPackaging(item.productId)) {
          errors[productId] = 'This product has no bulk packaging configured';
        }
        Object.assign(errors, validateFields([
          { id: `purchase-item-${index}-package-quantity`, label: `Item ${index + 1} package quantity`, value: item.packageQuantity, required: true, min: 1, wholeNumber: true },
          { id: `purchase-item-${index}-package-cost`, label: `Item ${index + 1} package cost`, value: item.packageUnitCost, required: true, min: 0 },
        ]));
      } else {
        Object.assign(errors, validateFields([
          { id: `purchase-item-${index}-quantity`, label: `Item ${index + 1} quantity`, value: item.quantity, required: true, min: 1, wholeNumber: true },
          { id: `purchase-item-${index}-cost`, label: `Item ${index + 1} unit cost`, value: item.unitCost, required: true, min: 0 },
        ]));
      }
    });
    return errors;
  };

  const clearPurchaseFieldError = (rule: FieldRule) => {
    setFieldErrors((current) => clearValidFieldError(current, rule.id, rule));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    const errors = validatePurchaseForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(errors);
      return;
    }

    const seen = new Set<string>();
    const payloadItems: CreatePurchaseItemPayload[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (seen.has(it.productId)) {
        continue;
      }
      seen.add(it.productId);

      if (it.entryMode === 'package') {
        const pkgQty = parseInt(it.packageQuantity, 10);
        const pkgCost = parseFloat(it.packageUnitCost);

        payloadItems.push({
          productId: it.productId,
          entryMode: 'package',
          packageQuantity: pkgQty,
          packageUnitCost: pkgCost,
        });
      } else {
        const qty = parseInt(it.quantity, 10);
        const cost = parseFloat(it.unitCost);

        payloadItems.push({
          productId: it.productId,
          entryMode: 'individual',
          quantity: qty,
          unitCost: cost,
        });
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplierId || null,
          referenceNumber: referenceNumber.trim() || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
          notes: notes.trim() || null,
          items: payloadItems,
          idempotencyKey,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to record purchase.');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the purchase.');
      document.getElementById('purchase-error-summary')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-overlay/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-line animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line-subtle bg-subtle/50">
          <div>
            <h2 className="text-lg font-bold text-ink-900 font-serif">
              Receive Stock / New Purchase
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Record inventory received from a supplier. Stock levels will increase automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -mr-2 text-ink-400 hover:text-ink-600 rounded-full hover:bg-subtle-strong transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form id="purchase-form" noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="purchase-supplier" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Supplier
              </label>
              <select
                id="purchase-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px] bg-card"
              >
                <option value="">No Supplier / Direct Purchase</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="purchase-ref" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Reference / Invoice #
              </label>
              <input
                id="purchase-ref"
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. INV-10492"
                className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px]"
              />
            </div>

            <div>
              <FormField id="purchase-date" label="Purchase Date" required error={fieldErrors['purchase-date']}>
                <input
                type="date"
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value);
                  clearPurchaseFieldError({ id: 'purchase-date', label: 'Purchase date', value: e.target.value, required: true });
                }}
                className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 min-h-[44px] bg-card"
              />
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h3 className="text-sm font-bold text-ink-900 font-serif">
                Items Received
              </h3>
              <span className="text-xs text-ink-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const selectedProduct = getProduct(item.productId);
                const hasPackaging = productHasPackaging(item.productId);

                return (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-subtle border border-line space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-5">
                        <FormField id={`purchase-item-${index}-product`} label="Product" required error={fieldErrors[`purchase-item-${index}-product`]}>
                        <select
                          id={`purchase-item-${index}-product`}
                          value={item.productId}
                          onChange={(e) => {
                            handleProductChange(index, e.target.value);
                            clearPurchaseFieldError({ id: `purchase-item-${index}-product`, label: `Item ${index + 1} product`, value: e.target.value, required: true });
                          }}
                          className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm bg-card min-h-[44px]"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Code (SKU): {p.sku})
                            </option>
                          ))}
                        </select>
                        </FormField>
                      </div>

                      {item.entryMode === 'individual' && (
                        <>
                          <div className="sm:col-span-2">
                            <FormField id={`purchase-item-${index}-quantity`} label="Qty" required error={fieldErrors[`purchase-item-${index}-quantity`]}>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => {
                                handleQuantityChange(index, e.target.value);
                                clearPurchaseFieldError({ id: `purchase-item-${index}-quantity`, label: `Item ${index + 1} quantity`, value: e.target.value, required: true, min: 1, wholeNumber: true });
                              }}
                              placeholder="1"
                              className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm bg-card min-h-[44px]"
                            />
                            </FormField>
                          </div>

                          <div className="sm:col-span-2">
                            <FormField id={`purchase-item-${index}-cost`} label="Unit Cost (KES)" required error={fieldErrors[`purchase-item-${index}-cost`]}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => {
                                handleUnitCostChange(index, e.target.value);
                                clearPurchaseFieldError({ id: `purchase-item-${index}-cost`, label: `Item ${index + 1} unit cost`, value: e.target.value, required: true, min: 0 });
                              }}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm bg-card min-h-[44px]"
                            />
                            </FormField>
                          </div>
                        </>
                      )}

                      {item.entryMode === 'package' && (
                        <>
                          <div className="sm:col-span-2">
                            <FormField id={`purchase-item-${index}-package-quantity`} label={`Qty (${selectedProduct?.package_unit}s)`} required error={fieldErrors[`purchase-item-${index}-package-quantity`]}>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.packageQuantity}
                              onChange={(e) => {
                                handlePackageQuantityChange(index, e.target.value);
                                clearPurchaseFieldError({ id: `purchase-item-${index}-package-quantity`, label: `Item ${index + 1} package quantity`, value: e.target.value, required: true, min: 1, wholeNumber: true });
                              }}
                              placeholder="1"
                              className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm bg-card min-h-[44px]"
                            />
                            </FormField>
                          </div>

                          <div className="sm:col-span-2">
                            <FormField id={`purchase-item-${index}-package-cost`} label={`Cost / ${selectedProduct?.package_unit} (KES)`} required error={fieldErrors[`purchase-item-${index}-package-cost`]}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.packageUnitCost}
                              onChange={(e) => {
                                handlePackageUnitCostChange(index, e.target.value);
                                clearPurchaseFieldError({ id: `purchase-item-${index}-package-cost`, label: `Item ${index + 1} package cost`, value: e.target.value, required: true, min: 0 });
                              }}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm bg-card min-h-[44px]"
                            />
                            </FormField>
                          </div>
                        </>
                      )}

                      <div className="sm:col-span-2">
                        <span className="block text-xs font-medium text-ink-600 mb-1">
                          Total
                        </span>
                        <div className="min-h-[44px] flex items-center font-mono font-semibold text-sm text-ink-900 px-2 bg-subtle-strong rounded-lg">
                          {formatCurrency(lineTotals[index])}
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length <= 1}
                          className="p-2 text-ink-400 hover:text-danger-600 rounded-lg hover:bg-subtle-active transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          aria-label="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {hasPackaging && (
                      <div className="flex items-center gap-4 pt-1 border-t border-line/60">
                        <span className="text-xs font-medium text-ink-600">Receive as:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`entry-mode-${index}`}
                            checked={item.entryMode === 'individual'}
                            onChange={() => handleEntryModeChange(index, 'individual')}
                            className="text-accent-link focus:ring-accent-500 w-4 h-4"
                          />
                          <span className="text-xs text-ink-700">
                            Individual {selectedProduct?.stock_unit || 'unit'}s
                          </span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`entry-mode-${index}`}
                            checked={item.entryMode === 'package'}
                            onChange={() => handleEntryModeChange(index, 'package')}
                            className="text-accent-link focus:ring-accent-500 w-4 h-4"
                          />
                          <span className="text-xs text-ink-700">
                            Bulk {selectedProduct?.package_unit}s
                          </span>
                        </label>
                      </div>
                    )}

                    {item.entryMode === 'package' &&
                      selectedProduct?.units_per_package &&
                      (() => {
                        const pkgQty = parseInt(item.packageQuantity, 10) || 0;
                        const pkgCost = parseFloat(item.packageUnitCost) || 0;
                        if (pkgQty <= 0) return null;
                        const stockUnits = pkgQty * selectedProduct.units_per_package;
                        const perUnitCost = pkgCost > 0 ? pkgCost / selectedProduct.units_per_package : null;
                        return (
                          <p className="text-xs text-ink-600 bg-card p-2 rounded border border-line">
                            Stock added: <strong>{stockUnits} {selectedProduct.stock_unit || 'unit'}s</strong>
                            {perUnitCost !== null && (
                              <>
                                {' '}· ≈ <strong>{formatCurrency(perUnitCost)}</strong> per {selectedProduct.stock_unit || 'unit'} (estimate — final cost is calculated server-side)
                              </>
                            )}
                          </p>
                        );
                      })()}
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-accent-text bg-accent-50 hover:bg-accent-100 border border-accent-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Add another product</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-line items-start">
            <div>
              <label htmlFor="purchase-notes" className="block text-xs font-semibold text-ink-700 mb-1.5">
                Notes / Receiving Remarks (optional)
              </label>
              <textarea
                id="purchase-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Delivered by lorry, batch #401..."
                className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm min-h-[80px] resize-y"
              />
            </div>

            <div className="bg-subtle p-4 rounded-xl border border-line space-y-2 text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 block">
                Grand Total Amount
              </span>
              <div className="text-2xl font-bold font-mono text-ink-900 font-serif">
                {formatCurrency(grandTotal)}
              </div>
              <p className="text-xs text-ink-500">
                {items.length} items to receive into inventory
              </p>
            </div>
          </div>
        </form>

        <div id="purchase-error-summary" className="sticky bottom-0 z-10 shrink-0 border-t border-line-subtle bg-subtle px-6 py-4">
          <FormErrorSummary errors={fieldErrors} labels={fieldLabels} serverError={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-600 bg-card border border-line-strong hover:bg-subtle rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="purchase-form"
            disabled={isSubmitting || items.length === 0}
            className="min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 border border-transparent rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? 'Recording Purchase...' : 'Complete & Receive Stock'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
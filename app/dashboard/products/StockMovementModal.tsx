'use client';

import { useRef, useState } from 'react';
import { ProductStockLevel } from '@/lib/supabase/types';
import FormField from '@/components/forms/FormField';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { focusFirstInvalid, validateFields, type FormErrors } from '@/components/forms/validation';

const FIELD_LABELS = { quantity: 'Quantity' };

interface StockMovementModalProps {
  product: ProductStockLevel;
  onClose: () => void;
  onSaved: () => void;
}

type MovementType = 'in' | 'out' | 'adjustment';

export default function StockMovementModal({
  product,
  onClose,
  onSaved,
}: StockMovementModalProps) {
  const [movementType, setMovementType] = useState<MovementType>('in');
  const [quantity, setQuantity] = useState<string>('1');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionKey, setSubmissionKey] = useState<string | null>(null);
  const [receiveAsPackage, setReceiveAsPackage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const submittingRef = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const numQty = parseInt(quantity, 10) || 0;
  const currentStock = product.current_stock ?? 0;

  const resetSubmissionKey = () => {
    setSubmissionKey(null);
  };

  const handleClose = () => {
    resetSubmissionKey();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const errors = validateFields([
      { id: 'quantity', label: 'Quantity', value: quantity, required: true, min: 1, wholeNumber: true },
    ]);
    if (movementType === 'out' && numQty > currentStock) {
      errors.quantity = `Not enough stock — only ${currentStock} available`;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(errors);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError(null);

    // Reuse the same key for retries of the same logical submission.
    const key = submissionKey ?? crypto.randomUUID();
    if (!submissionKey) {
      setSubmissionKey(key);
    }

    // Calculate actual stock quantity based on packaging
    const isBulkReceipt = movementType === 'in' && receiveAsPackage && product.package_unit && product.units_per_package;
    const actualQuantity = isBulkReceipt ? numQty * (product.units_per_package || 1) : numQty;

    // Update note if bulk receipt
    let finalNote = note.trim();
    if (isBulkReceipt) {
      const packageText = `Received ${numQty} ${product.package_unit}s (${product.units_per_package} ${product.stock_unit || 'unit'}s/${product.package_unit})`;
      finalNote = finalNote ? `${packageText}. ${finalNote}` : packageText;
    }

    try {
      const response = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          movementType,
          quantity: actualQuantity,
          note: finalNote || null,
          idempotencyKey: key,
        }),
      });

      if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message = body?.error || body?.message || 'An error occurred while recording stock movement';
          if (typeof message === 'string' && (
            message.toLowerCase().includes('not enough stock') ||
            message.toLowerCase().includes('insufficient stock')
          )) {
            const mappedErrors = { quantity: message };
            setFieldErrors(mappedErrors);
            focusFirstInvalid(mappedErrors);
            return;
          }
          throw new Error(message);
      }

      onSaved();
      resetSubmissionKey();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while recording stock movement');
      window.setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-panel border border-line rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-6 sm:px-8 pt-6 sm:pt-8 pb-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-ink-900 font-serif">
              Record Stock Movement
            </h2>
            <p className="text-xs font-mono text-ink-500 mt-1">
              <span className="font-semibold text-ink-900 font-sans">{product.name}</span> — Current stock: {currentStock}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-500 hover:text-ink-900 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form id="movement-form" noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-4">

          {/* Movement Type Selector */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">
              Movement Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMovementType('in');
                  resetSubmissionKey();
                  if (Number(quantity) >= 1 && Number.isInteger(Number(quantity))) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.quantity;
                      return next;
                    });
                  }
                }}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer border ${
                  movementType === 'in'
                    ? 'bg-accent-500 text-white border-accent-500 shadow-xs'
                    : 'bg-card text-ink-700 border-line hover:bg-subtle'
                }`}
              >
                Stock In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovementType('out');
                  resetSubmissionKey();
                  if (Number(quantity) > currentStock) {
                    setFieldErrors((current) => ({ ...current, quantity: `Not enough stock — only ${currentStock} available` }));
                  }
                }}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer border ${
                  movementType === 'out'
                    ? 'bg-accent-500 text-white border-accent-500 shadow-xs'
                    : 'bg-card text-ink-700 border-line hover:bg-subtle'
                }`}
              >
                Stock Out
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovementType('adjustment');
                  resetSubmissionKey();
                  if (Number(quantity) >= 1 && Number.isInteger(Number(quantity))) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.quantity;
                      return next;
                    });
                  }
                }}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer border ${
                  movementType === 'adjustment'
                    ? 'bg-accent-500 text-white border-accent-500 shadow-xs'
                    : 'bg-card text-ink-700 border-line hover:bg-subtle'
                }`}
              >
                Adjustment
              </button>
            </div>
          </div>

          {/* Packaging Selector (Only for IN movements if product has packaging) */}
          {movementType === 'in' && product.package_unit && product.units_per_package && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                Receive stock as:
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="receiveMode"
                    checked={!receiveAsPackage}
                    onChange={() => {
                      setReceiveAsPackage(false);
                      resetSubmissionKey();
                    }}
                    className="text-accent-link focus:ring-accent-500 w-4 h-4"
                  />
                  <span className="text-sm text-ink-700">
                    Individual {product.stock_unit || 'unit'}s
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="receiveMode"
                    checked={receiveAsPackage}
                    onChange={() => {
                      setReceiveAsPackage(true);
                      resetSubmissionKey();
                    }}
                    className="text-accent-link focus:ring-accent-500 w-4 h-4"
                  />
                  <span className="text-sm text-ink-700">
                    Bulk {product.package_unit}s
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <FormField id="quantity" label={`Quantity ${receiveAsPackage && movementType === 'in' ? `(in ${product.package_unit}s)` : `(in ${product.stock_unit || 'unit'}s)`}`} required error={fieldErrors.quantity}>
            {(controlProps) => (
              <>
            <input
              {...controlProps}
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                resetSubmissionKey();
                const nextErrors = validateFields([{ id: 'quantity', label: 'Quantity', value: e.target.value, required: true, min: 1, wholeNumber: true }]);
                if (!nextErrors.quantity || (movementType !== 'out' || Number(e.target.value) <= currentStock)) {
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.quantity;
                    return next;
                  });
                }
              }}
              className="w-full min-h-[44px] px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            {receiveAsPackage && movementType === 'in' && product.units_per_package && numQty > 0 && (
              <p className="mt-2 text-sm text-ink-600 bg-subtle p-2 rounded border border-line-subtle">
                Stock added: <strong>{numQty * product.units_per_package} {product.stock_unit || 'unit'}s</strong>
              </p>
            )}
              </>
            )}
          </FormField>

          {/* Note Input */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="note">
              Note <span className="text-ink-500 font-normal">(optional)</span>
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                resetSubmissionKey();
              }}
              className="w-full min-h-[44px] px-3 py-2 border border-line rounded-lg bg-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="e.g. Restock from supplier, Damaged goods"
            />
          </div>
        </form>

        <div ref={summaryRef} className="sticky bottom-0 z-10 shrink-0 border-t border-line bg-panel px-6 py-4 sm:px-8">
          <FormErrorSummary errors={fieldErrors} labels={FIELD_LABELS} serverError={error} />
          <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-700 bg-subtle-strong hover:bg-subtle-active rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="movement-form"
            disabled={loading}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Record Movement'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

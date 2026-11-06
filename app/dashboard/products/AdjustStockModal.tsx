'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { BusinessRole } from '@/lib/supabase/business-context';
import { MANUAL_ADJUSTMENT_ROLES } from '@/lib/supabase/stock-roles';
import type { ProductStockLevel } from '@/lib/supabase/types';
import FormField from '@/components/forms/FormField';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { focusFirstInvalid, validateFields, type FormErrors } from '@/components/forms/validation';

const FIELD_LABELS = { quantity: 'Quantity', reason_code: 'Reason', note: 'Note' };
const WRITE_OFF_REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'expired', label: 'Expired' },
  { value: 'lost', label: 'Lost or stolen' },
  { value: 'own_use', label: 'Used in the shop' },
  { value: 'supplier_return', label: 'Returned to supplier' },
  { value: 'other', label: 'Other' },
] as const;

interface AdjustStockModalProps {
  product: ProductStockLevel;
  role: BusinessRole;
  onClose: () => void;
  onSaved: () => void;
}

type AdjustmentTab = 'add' | 'write_off' | 'count';

export default function AdjustStockModal({ product, role, onClose, onSaved }: AdjustStockModalProps) {
  const [tab, setTab] = useState<AdjustmentTab>('add');
  const [quantity, setQuantity] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const idempotencyKeyRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const currentStock = product.current_stock ?? 0;
  const canAdjust = MANUAL_ADJUSTMENT_ROLES.includes(role);
  const counted = quantity === '' ? Number.NaN : Number(quantity);
  const difference = Number.isFinite(counted) ? counted - currentStock : null;
  const requiresNote = tab === 'count' ? difference !== null && difference !== 0 : ['lost', 'other'].includes(reasonCode);

  const changeTab = (next: AdjustmentTab) => {
    setTab(next);
    setFieldErrors({});
    setError(null);
    idempotencyKeyRef.current = null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canAdjust || submittingRef.current) return;

    const errors = validateFields([
      {
        id: 'quantity',
        label: tab === 'count' ? 'Counted quantity' : 'Quantity',
        value: quantity,
        required: true,
        min: tab === 'count' ? 0 : 1,
        ...(tab === 'write_off' ? { max: currentStock } : {}),
        wholeNumber: true,
      },
      ...(tab === 'write_off' ? [{ id: 'reason_code', label: 'Reason', value: reasonCode, required: true }] : []),
      ...(requiresNote ? [{ id: 'note', label: 'Note', value: note, required: true }] : []),
    ]);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstInvalid(errors);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError(null);
    idempotencyKeyRef.current ??= crypto.randomUUID();

    try {
      const response = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          kind: tab,
          quantity: Number(quantity),
          reason_code: tab === 'write_off' ? reasonCode : null,
          note: note.trim() || null,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string; field?: string } | null;
        const message = body?.error ?? 'Unable to save this stock change.';
        if (body?.field) {
          const mappedErrors = { [body.field]: message };
          setFieldErrors(mappedErrors);
          focusFirstInvalid(mappedErrors);
          return;
        }
        throw new Error(message);
      }

      onSaved();
      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to save this stock change.';
      setError(message);
      window.setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h2 className="text-xl font-bold font-serif text-ink-900">Adjust stock</h2>
            <p className="mt-1 break-words text-sm text-ink-600">
              {product.name} · System stock: {currentStock} {product.stock_unit || 'units'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="min-h-[44px] min-w-[44px] text-xl text-ink-500 hover:text-ink-900 disabled:opacity-50" aria-label="Close stock adjustment">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Stock action">
            {([
              ['add', 'Add stock'],
              ['write_off', 'Write off'],
              ['count', 'Stock count'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => changeTab(value)}
                className={`min-h-[44px] rounded-lg border px-2 py-2 text-sm font-medium ${
                  tab === value ? 'border-accent-500 bg-accent-50 text-accent-text' : 'border-line bg-card text-ink-700 hover:bg-subtle'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'add' ? (
            <div className="mt-5 space-y-3 rounded-lg border border-line bg-subtle p-4">
              <h3 className="font-semibold text-ink-900">New stock comes from purchases</h3>
              <p className="text-sm leading-6 text-ink-600">
                Record a purchase to add stock. You can receive it from a supplier or leave the supplier unspecified.
              </p>
              <Link href="/dashboard/purchases" onClick={onClose} className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">
                Go to purchases
              </Link>
            </div>
          ) : !canAdjust ? (
            <p className="mt-5 rounded-lg border border-line bg-subtle p-4 text-sm leading-6 text-ink-600">
              Only an owner or admin can record write-offs or stock counts. Ask them to make this correction.
            </p>
          ) : (
            <form id="adjust-stock-form" noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
              {tab === 'write_off' ? (
                <>
                  <p className="text-sm leading-6 text-ink-600">
                    A write-off records stock that is no longer available. This reduces stock and keeps the reason in your history.
                  </p>
                  <FormField id="quantity" label={`Quantity to write off (max ${currentStock})`} required error={fieldErrors.quantity}>
                    {(props) => (
                      <input {...props} type="number" min="1" max={currentStock} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="min-h-[44px] w-full rounded-lg border border-line bg-card px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500" />
                    )}
                  </FormField>
                  <FormField id="reason_code" label="Reason" required error={fieldErrors.reason_code}>
                    {(props) => (
                      <select {...props} value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className="min-h-[44px] w-full rounded-lg border border-line bg-card px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500">
                        <option value="">Choose a reason</option>
                        {WRITE_OFF_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                      </select>
                    )}
                  </FormField>
                  <FormField id="note" label="Note" required={requiresNote} hint={requiresNote ? 'Required for Lost or stolen and Other.' : 'Optional; add useful detail for the record.'} error={fieldErrors.note}>
                    {(props) => (
                      <textarea {...props} rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500" />
                    )}
                  </FormField>
                  <p className="rounded-lg border border-line bg-subtle p-3 text-sm text-ink-700">
                    Cost value written off: <strong>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format((Number(quantity) || 0) * product.cost_price)}</strong>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm leading-6 text-ink-600">
                    This sets the stock to the number you counted. It does not mean that number of units were added.
                  </p>
                  <FormField id="quantity" label="Counted quantity" required hint="Enter the total quantity you physically counted. Zero is allowed." error={fieldErrors.quantity}>
                    {(props) => (
                      <input {...props} type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="min-h-[44px] w-full rounded-lg border border-line bg-card px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500" />
                    )}
                  </FormField>
                  {difference !== null && (
                    <p className="rounded-lg border border-line bg-subtle p-3 text-sm font-medium text-ink-700">
                      System says {currentStock}, you counted {counted}, difference {difference > 0 ? '+' : ''}{difference}
                    </p>
                  )}
                  <FormField id="note" label="Note" required={requiresNote} hint={requiresNote ? 'Required because the count differs from the system stock.' : 'Optional when the count matches the system.'} error={fieldErrors.note}>
                    {(props) => (
                      <textarea {...props} rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500" />
                    )}
                  </FormField>
                </>
              )}
            </form>
          )}
        </div>

        <div ref={summaryRef} className="sticky bottom-0 z-10 shrink-0 border-t border-line bg-panel px-5 py-4 sm:px-7">
          {tab !== 'add' && canAdjust && (
            <FormErrorSummary errors={fieldErrors} labels={FIELD_LABELS} serverError={error} />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} disabled={loading} className="min-h-[44px] rounded-lg bg-subtle-strong px-4 text-sm font-medium text-ink-700 hover:bg-subtle-active">Cancel</button>
            {tab !== 'add' && canAdjust && (
              <button type="submit" form="adjust-stock-form" disabled={loading} className="min-h-[44px] rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-60">
                {loading ? 'Saving…' : tab === 'count' ? 'Save stock count' : 'Record write-off'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

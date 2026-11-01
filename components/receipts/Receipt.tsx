import { forwardRef } from 'react';
import type { Sale } from '@/lib/supabase/types';
import { BRAND_COMPANY_NAME } from '@/lib/brand';
import { RECEIPT_THANK_YOU_MESSAGE } from '@/lib/receipt-constants';

interface ReceiptProps {
  businessName: string;
  sale: Sale;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const Receipt = forwardRef<HTMLElement, ReceiptProps>(function Receipt(
  { businessName, sale },
  ref
) {
  const receiptReference = sale.id.slice(-8).toUpperCase();
  const items = sale.sale_items ?? [];

  return (
    <article
      ref={ref}
      className="receipt-document rounded-lg border border-line bg-card p-5 text-ink-900 shadow-2xs"
    >
      <header className="text-center">
        <h1 className="break-words font-serif text-2xl font-bold leading-tight">
          {businessName}
        </h1>
        <p className="mt-4 text-sm font-bold tracking-widest">SALES RECEIPT</p>
      </header>

      <dl className="mt-5 space-y-1 border-y border-line py-3 text-xs">
        <div className="flex justify-between gap-3">
          <dt>Receipt ref</dt>
          <dd className="font-mono font-semibold">#{receiptReference}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Date</dt>
          <dd className="text-right">{formatDate(sale.sale_date)}</dd>
        </div>
        {sale.customer_name?.trim() && (
          <div className="flex justify-between gap-3">
            <dt>Customer</dt>
            <dd className="max-w-[65%] break-words text-right">{sale.customer_name}</dd>
          </div>
        )}
      </dl>

      <section className="mt-4" aria-label="Receipt items">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border-b border-line-subtle pb-3 last:border-0">
              <p className="break-words text-sm font-semibold">
                {item.product?.name || 'Product'}
              </p>
              <div className="mt-1 flex items-start justify-between gap-3 text-xs">
                <span className="min-w-0 break-words">
                  {Math.abs(item.quantity)} x {formatCurrency(item.unit_price)}
                </span>
                <span className="shrink-0 text-right font-semibold">
                  {formatCurrency(item.line_total)}
                </span>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-2 text-center text-xs">No item details available.</p>
          )}
        </div>
      </section>

      <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-line py-3">
        <span className="text-sm font-bold uppercase">Total</span>
        <span className="font-mono text-lg font-bold">{formatCurrency(sale.total_amount)}</span>
      </div>

      <div className="flex justify-between gap-3 text-xs">
        <span>Payment method</span>
        <span className="max-w-[65%] break-words text-right">
          {sale.payment_method || 'Not specified'}
        </span>
      </div>

      <p className="mt-6 text-center text-sm font-medium">{RECEIPT_THANK_YOU_MESSAGE}</p>
      <p className="mt-3 text-center text-[10px] text-ink-500">
        Powered by {BRAND_COMPANY_NAME}
      </p>
    </article>
  );
});

export default Receipt;

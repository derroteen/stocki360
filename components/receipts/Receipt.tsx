import { forwardRef } from 'react';
import type { Sale } from '@/lib/supabase/types';
import { RECEIPT_FOOTER_NOTE } from '@/lib/receipt-constants';

interface ReceiptProps {
  businessName?: string | null;
  sale: Sale;
  plain?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/[\u00a0\u202f]/g, '\u00a0');
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
  { businessName, sale, plain = false },
  ref
) {
  const receiptReference = sale.id.slice(-8).toUpperCase();
  const items = sale.sale_items ?? [];

  return (
    <article
      ref={ref}
      className={`receipt-document${plain ? ' receipt-document--plain' : ''}`}
    >
      <header className="receipt-header">
        {businessName?.trim() && (
          <h1 className="receipt-business-name">{businessName}</h1>
        )}
        <p className="receipt-title">SALES RECEIPT</p>
      </header>

      <dl className="receipt-meta">
        <div className="receipt-row-grid">
          <dt>Receipt ref</dt>
          <dd className="receipt-value">#{receiptReference}</dd>
        </div>
        <div className="receipt-row-grid">
          <dt>Date</dt>
          <dd className="receipt-value">{formatDate(sale.sale_date)}</dd>
        </div>
        {sale.customer_name?.trim() && (
          <div className="receipt-row-grid">
            <dt>Customer</dt>
            <dd className="receipt-value">{sale.customer_name}</dd>
          </div>
        )}
      </dl>

      <section className="receipt-items" aria-label="Receipt items">
        {items.map((item) => (
          <div key={item.id} className="receipt-item">
            <p className="receipt-product-name">{item.product?.name || 'Product'}</p>
            <div className="receipt-row-grid receipt-item-detail">
              <span className="receipt-quantity">
                {Math.abs(item.quantity)} x {formatCurrency(item.unit_price)}
              </span>
              <span className="receipt-amount">{formatCurrency(item.line_total)}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="receipt-empty">No item details available.</p>
        )}
      </section>

      <div className="receipt-total receipt-row-grid">
        <span>TOTAL</span>
        <span className="receipt-amount">{formatCurrency(sale.total_amount)}</span>
      </div>

      <div className="receipt-payment receipt-row-grid">
        <span>Payment method</span>
        <span className="receipt-value">{sale.payment_method || 'Not specified'}</span>
      </div>

      <p className="receipt-footer-note">{RECEIPT_FOOTER_NOTE}</p>
    </article>
  );
});

export default Receipt;

'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { StockReconciliationRow } from '@/lib/supabase/types';
import { getStockReportDates, getStockReportTimestamps, type StockReportDates, type StockReportPreset } from '@/lib/stock-report';

interface StockReportClientProps {
  businessId: string;
  initialDates: StockReportDates;
  initialRows: StockReconciliationRow[];
  initialError?: string | null;
}

const COLUMNS: Array<{ key: keyof StockReconciliationRow; label: string; currency?: boolean }> = [
  { key: 'opening_balance', label: 'Opening' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'sales', label: 'Sales' },
  { key: 'write_offs', label: 'Write-offs' },
  { key: 'count_corrections', label: 'Corrections' },
  { key: 'unclassified_legacy', label: 'Unclassified (before tracking)' },
  { key: 'closing', label: 'Closing' },
  { key: 'write_off_cost', label: 'Write-off cost', currency: true },
  { key: 'count_correction_cost', label: 'Correction cost', currency: true },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(value);
}

function sumRows(rows: StockReconciliationRow[], key: keyof StockReconciliationRow) {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

function isHighlighted(row: StockReconciliationRow) {
  return row.write_offs !== 0 || row.count_corrections !== 0 || row.unclassified_legacy !== 0;
}

export default function StockReportClient({ businessId, initialDates, initialRows, initialError = null }: StockReportClientProps) {
  const [dates, setDates] = useState(initialDates);
  const [fromDate, setFromDate] = useState(initialDates.fromDate);
  const [toDate, setToDate] = useState(initialDates.toDate);
  const [preset, setPreset] = useState<StockReportPreset>('this_month');
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const applyPreset = (nextPreset: Exclude<StockReportPreset, 'custom'>) => {
    const nextDates = getStockReportDates(nextPreset);
    setPreset(nextPreset);
    setFromDate(nextDates.fromDate);
    setToDate(nextDates.toDate);
  };

  const loadReport = async () => {
    if (!fromDate || !toDate || fromDate > toDate) {
      setError('Choose a valid date range. The start date must be on or before the end date.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const timestamps = getStockReportTimestamps({ fromDate, toDate });
      const { data, error: rpcError } = await supabase.rpc('stock_reconciliation', {
        p_business_id: businessId,
        p_from: timestamps.from,
        p_to: timestamps.to,
      });

      if (rpcError) {
        setError(rpcError.message || 'Unable to load the stock report.');
        return;
      }
      setDates({ fromDate, toDate });
      setRows((data ?? []) as StockReconciliationRow[]);
    } catch (reportError) {
      console.error('Unable to load stock report:', reportError);
      setError('Unable to load the stock report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    const header = ['Product', ...COLUMNS.map(({ label }) => label)];
    const body = rows.map((row) => [
      row.product_name,
      ...COLUMNS.map(({ key }) => row[key]),
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-report-${dates.fromDate}-to-${dates.toDate}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="stock-report space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-link">Manage</p>
          <h1 className="mt-1 text-2xl font-bold font-serif text-ink-900 sm:text-3xl">Stock report</h1>
          <p className="mt-1 text-sm text-ink-600">See how stock changed during the selected period.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={downloadCsv} disabled={loading || rows.length === 0} className="min-h-[44px] rounded-lg border border-line-strong bg-card px-4 text-sm font-semibold text-ink-700 hover:bg-subtle disabled:opacity-50">Download CSV</button>
          <button type="button" onClick={() => window.print()} className="min-h-[44px] rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">Print</button>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-line bg-panel p-4 shadow-2xs sm:p-5 print:hidden" aria-label="Report date range">
        <div className="flex flex-wrap gap-2">
          {([
            ['this_month', 'This month'],
            ['last_month', 'Last month'],
            ['last_30_days', 'Last 30 days'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={preset === value} onClick={() => applyPreset(value)} className={`min-h-[44px] rounded-lg border px-3 text-sm font-medium ${preset === value ? 'border-accent-500 bg-accent-50 text-accent-text' : 'border-line bg-card text-ink-700 hover:bg-subtle'}`}>
              {label}
            </button>
          ))}
          <button type="button" aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')} className={`min-h-[44px] rounded-lg border px-3 text-sm font-medium ${preset === 'custom' ? 'border-accent-500 bg-accent-50 text-accent-text' : 'border-line bg-card text-ink-700 hover:bg-subtle'}`}>
            Custom
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="block min-w-0 text-sm font-medium text-ink-700">
            From
            <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPreset('custom'); }} className="mt-1 min-h-[44px] w-full min-w-0 rounded-lg border border-line bg-card px-3 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500" />
          </label>
          <label className="block min-w-0 text-sm font-medium text-ink-700">
            To
            <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPreset('custom'); }} className="mt-1 min-h-[44px] w-full min-w-0 rounded-lg border border-line bg-card px-3 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500" />
          </label>
          <button type="button" onClick={loadReport} disabled={loading} className="min-h-[44px] rounded-lg bg-accent-600 px-5 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-60">
            {loading ? 'Loading…' : 'Apply range'}
          </button>
        </div>
      </section>

      <p className="text-sm font-medium text-ink-700">
        Showing {dates.fromDate} to {dates.toDate} (Nairobi time, inclusive).
      </p>

      {error && <div role="alert" className="rounded-lg border border-warn-600/30 bg-warn-100 p-3 text-sm text-warn-700">{error}</div>}
      {rows.some((row) => row.unexplained_difference !== 0) && (
        <div role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm font-semibold text-danger-800">
          Warning: one or more products have an unexplained difference in the stock reconciliation. Please contact support.
        </div>
      )}

      {rows.length === 0 && !error ? (
        <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-ink-600">
          No products have stock activity in this period.
        </div>
      ) : (
        <>
          <div className="stock-report__table hidden overflow-x-auto rounded-xl border border-line bg-panel sm:block">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-subtle text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-3 py-3">Product</th>
                  {COLUMNS.map(({ key, label }) => <th key={key} className="px-3 py-3 text-right">{label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {rows.map((row) => (
                  <tr key={row.product_id} className={isHighlighted(row) ? 'bg-warn-100/60' : undefined}>
                    <th scope="row" className="max-w-56 break-words px-3 py-3 font-semibold text-ink-900">{row.product_name}</th>
                    {COLUMNS.map(({ key, currency }) => (
                      <td key={key} className="whitespace-nowrap px-3 py-3 text-right font-mono text-ink-700">
                        {currency ? formatCurrency(Number(row[key])) : row[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-line bg-subtle font-bold text-ink-900">
                <tr>
                  <th scope="row" className="px-3 py-3">Total</th>
                  {COLUMNS.map(({ key, currency }) => (
                    <td key={key} className="whitespace-nowrap px-3 py-3 text-right font-mono">
                      {currency ? formatCurrency(sumRows(rows, key)) : sumRows(rows, key)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="stock-report__mobile space-y-3 sm:hidden">
            {rows.map((row) => (
              <article key={row.product_id} className={`min-w-0 rounded-xl border bg-panel p-4 ${isHighlighted(row) ? 'border-warn-600/40' : 'border-line'}`}>
                <h2 className="break-words font-semibold text-ink-900">{row.product_name}</h2>
                <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-3">
                  {COLUMNS.map(({ key, label, currency }) => (
                    <div key={key} className="min-w-0">
                      <dt className="break-words text-xs text-ink-500">{label}</dt>
                      <dd className="break-words font-mono text-sm text-ink-800">{currency ? formatCurrency(Number(row[key])) : row[key]}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
            <article className="rounded-xl border-2 border-line bg-subtle p-4">
              <h2 className="font-bold text-ink-900">Total</h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                {COLUMNS.map(({ key, label, currency }) => (
                  <div key={key}><dt className="text-xs text-ink-500">{label}</dt><dd className="break-words font-mono text-sm font-bold text-ink-800">{currency ? formatCurrency(sumRows(rows, key)) : sumRows(rows, key)}</dd></div>
                ))}
              </dl>
            </article>
          </div>
        </>
      )}

      <aside className="rounded-xl border border-line bg-subtle p-4 text-sm leading-6 text-ink-700">
        <h2 className="font-semibold text-ink-900">How to read this report</h2>
        <p className="mt-1 font-medium">Opening + Purchases - Sales - Write-offs +/- Corrections = Closing</p>
        <p className="mt-1">“Unclassified (before tracking)” means older stock changes that cannot be assigned to a purchase, sale, or reason. Highlighted products have write-offs, corrections, or unclassified stock changes.</p>
      </aside>
    </div>
  );
}

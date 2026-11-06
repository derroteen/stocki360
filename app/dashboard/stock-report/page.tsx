import { redirect } from 'next/navigation';
import { getActiveBusinessResolution } from '@/lib/supabase/business-context';
import { MANUAL_ADJUSTMENT_ROLES } from '@/lib/supabase/stock-roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { StockReconciliationRow } from '@/lib/supabase/types';
import { getStockReportDates, getStockReportTimestamps } from '@/lib/stock-report';
import StockReportClient from './StockReportClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stock report' };

export default async function StockReportPage() {
  const resolution = await getActiveBusinessResolution();
  if (!resolution.context) {
    redirect('/dashboard/select-business');
  }

  if (!MANUAL_ADJUSTMENT_ROLES.includes(resolution.context.role)) {
    return (
      <div className="rounded-xl border border-line bg-panel p-5 text-sm leading-6 text-ink-600">
        The stock report is available to owners and admins.
      </div>
    );
  }

  const dates = getStockReportDates('this_month');
  const timestamps = getStockReportTimestamps(dates);
  const supabase = await createSupabaseServerClient();
  let rows: StockReconciliationRow[] = [];
  let initialError: string | null = null;
  try {
    const { data, error } = await supabase.rpc('stock_reconciliation', {
      p_business_id: resolution.context.businessId,
      p_from: timestamps.from,
      p_to: timestamps.to,
    });

    if (error) {
      console.error('Unable to load initial stock reconciliation:', error);
      initialError = 'Unable to load the stock report. Please try applying the date range again.';
    } else {
      rows = (data ?? []) as StockReconciliationRow[];
    }
  } catch (reportError) {
    console.error('Unable to load initial stock reconciliation:', reportError);
    initialError = 'Unable to load the stock report. Please try applying the date range again.';
  }

  return (
    <StockReportClient
      businessId={resolution.context.businessId}
      initialDates={dates}
      initialRows={rows}
      initialError={initialError}
    />
  );
}

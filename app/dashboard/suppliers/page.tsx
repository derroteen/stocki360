import { redirect } from 'next/navigation';
import SuppliersTable from './SuppliersTable';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';

export const dynamic = 'force-dynamic';

export interface SupplierPurchaseStats {
  [supplierId: string]: {
    orderCount: number;
    totalAmount: number;
  };
}

export default async function SuppliersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context && resolution.memberships.length === 0) {
    redirect('/dashboard/select-business');
  }

  if (!resolution.context && resolution.needsSelection) {
    redirect('/dashboard/select-business');
  }

  if (!resolution.context) {
    redirect('/login');
  }

  const activeBusinessId = resolution.context.businessId;

  let suppliers: any[] = [];
  let purchases: any[] = [];

  try {
    const [
      { data: suppliersData },
      { data: purchasesData },
    ] = await Promise.all([
      supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', activeBusinessId)
        .order('name', { ascending: true }),
      supabase
        .from('purchases')
        .select('id, supplier_id, total_amount')
        .eq('business_id', activeBusinessId),
    ]);

    if (suppliersData) {
      suppliers = suppliersData;
    }
    if (purchasesData) {
      purchases = purchasesData;
    }
  } catch {
    // Graceful fallback if tables or queries are temporarily unavailable
  }

  // Aggregate stats per supplier
  const stats: SupplierPurchaseStats = {};
  for (const p of purchases) {
    if (p.supplier_id) {
      if (!stats[p.supplier_id]) {
        stats[p.supplier_id] = { orderCount: 0, totalAmount: 0 };
      }
      stats[p.supplier_id].orderCount += 1;
      stats[p.supplier_id].totalAmount += Number(p.total_amount) || 0;
    }
  }

  return <SuppliersTable suppliers={suppliers} stats={stats} />;
}

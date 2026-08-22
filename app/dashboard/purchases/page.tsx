import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Purchase, Supplier, ProductStockLevel } from '@/lib/supabase/types';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';
import PurchasesTable from './PurchasesTable';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
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

  let purchases: Purchase[] = [];
  let suppliers: Supplier[] = [];
  let activeProducts: ProductStockLevel[] = [];

  try {
    // Single consolidated query batch for active business data
    const [
      { data: purchasesData },
      { data: suppliersData },
      { data: stockLevels },
      { data: activeProductRows },
    ] = await Promise.all([
      supabase
        .from('purchases')
        .select(`
          id,
          business_id,
          supplier_id,
          reference_number,
          purchase_date,
          notes,
          total_amount,
          created_by,
          created_at,
          updated_at,
          supplier:suppliers(id, name, contact_person, phone, email),
          purchase_items(
            id,
            purchase_id,
            product_id,
            quantity,
            unit_cost,
            line_total,
            created_at,
            product:products(id, name, sku)
          )
        `)
        .eq('business_id', activeBusinessId)
        .order('purchase_date', { ascending: false }),
      supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', activeBusinessId)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('product_stock_levels')
        .select('*')
        .eq('business_id', activeBusinessId),
      supabase
        .from('products')
        .select('id')
        .eq('business_id', activeBusinessId)
        .eq('is_active', true),
    ]);

    if (purchasesData) {
      purchases = purchasesData as unknown as Purchase[];
    }

    if (suppliersData) {
      suppliers = suppliersData as Supplier[];
    }

    if (stockLevels && activeProductRows) {
      const activeIds = new Set((activeProductRows as Array<{ id: string }>).map((row) => row.id));
      activeProducts = (stockLevels as ProductStockLevel[]).filter((p) => activeIds.has(p.id));
    }
  } catch {
    // Graceful fallback
  }

  return (
    <PurchasesTable
      purchases={purchases}
      activeSuppliers={suppliers}
      activeProducts={activeProducts}
    />
  );
}

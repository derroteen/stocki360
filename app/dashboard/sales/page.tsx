import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Sale, ProductStockLevel } from '@/lib/supabase/types';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';
import SalesTable from './SalesTable';

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
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

  let sales: Sale[] = [];
  let activeProducts: ProductStockLevel[] = [];

  try {
    const [{ data: salesData }, { data: stockLevels }, { data: activeProductRows }] = await Promise.all([
      supabase
        .from('sales')
        .select(`
          id,
          business_id,
          customer_name,
          customer_phone,
          reference_number,
          sale_date,
          payment_method,
          notes,
          total_amount,
          created_by,
          created_at,
          updated_at,
          sale_items(
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            line_total,
            entry_mode,
            package_quantity,
            package_unit_snapshot,
            units_per_package_snapshot,
            package_unit_price,
            created_at,
            product:products(id, name, sku)
          )
        `)
        .eq('business_id', activeBusinessId)
        .order('sale_date', { ascending: false }),
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

    if (salesData) {
      sales = salesData as unknown as Sale[];
    }

    if (stockLevels && activeProductRows) {
      const activeIds = new Set((activeProductRows as Array<{ id: string }>).map((row) => row.id));
      activeProducts = (stockLevels as ProductStockLevel[]).filter((p) => activeIds.has(p.id));
    }
  } catch {
    // Graceful fallback
  }

  return <SalesTable sales={sales} activeProducts={activeProducts} />;
}
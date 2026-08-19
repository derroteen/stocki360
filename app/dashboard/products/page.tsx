import { redirect } from 'next/navigation';
import ProductsTable from './ProductsTable';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductStockLevel } from '@/lib/supabase/types';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check authentication first so logged-out users are not misclassified as zero-membership users.
  if (!user) {
    redirect('/login');
  }

  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context && resolution.memberships.length === 0) {
    // Authenticated users with no memberships should be sent to business onboarding.
    redirect('/dashboard/select-business');
  }

  if (!resolution.context && resolution.needsSelection) {
    redirect('/dashboard/select-business');
  }

  if (!resolution.context) {
    redirect('/login');
  }

  const activeBusinessId = resolution.context.businessId;

  let activeProducts: ProductStockLevel[] = [];
  let archivedProducts: ProductStockLevel[] = [];

  try {
    const [{ data: stockLevels }, { data: productStates }] = await Promise.all([
      supabase
        .from('product_stock_levels')
        .select('*')
        .eq('business_id', activeBusinessId),
      supabase
        .from('products')
        .select('id,is_active')
        .eq('business_id', activeBusinessId)
    ]);

    if (stockLevels && productStates) {
      const activeIds = new Set(
        (productStates as Array<{ id: string; is_active: boolean }>)
          .filter((row) => row.is_active)
          .map((row) => row.id)
      );
      const archivedIds = new Set(
        (productStates as Array<{ id: string; is_active: boolean }>)
          .filter((row) => !row.is_active)
          .map((row) => row.id)
      );

      activeProducts = (stockLevels as ProductStockLevel[]).filter((p) => activeIds.has(p.id));
      archivedProducts = (stockLevels as ProductStockLevel[]).filter((p) => archivedIds.has(p.id));
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }

  return <ProductsTable active={activeProducts} archived={archivedProducts} />;
}

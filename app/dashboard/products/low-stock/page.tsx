import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductStockLevel, Category, Supplier, ProductBarcode } from '@/lib/supabase/types';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';
import LowStockTable from './LowStockTable';

export const dynamic = 'force-dynamic';

export default async function LowStockPage() {
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

  let lowStockProducts: ProductStockLevel[] = [];
  let categories: Category[] = [];
  let suppliers: Supplier[] = [];
  let barcodes: ProductBarcode[] = [];

  try {
    // Single consolidated query batch reusing the existing product_stock_levels view
    const [
      { data: stockLevels },
      { data: activeProductRows },
      { data: categoriesData },
      { data: suppliersData },
      { data: barcodesData },
    ] = await Promise.all([
      supabase
        .from('product_stock_levels')
        .select('*')
        .eq('business_id', activeBusinessId),
      supabase
        .from('products')
        .select('id')
        .eq('business_id', activeBusinessId)
        .eq('is_active', true),
      supabase
        .from('categories')
        .select('*')
        .eq('business_id', activeBusinessId)
        .order('name', { ascending: true }),
      supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', activeBusinessId)
        .order('name', { ascending: true }),
      supabase
        .from('product_barcodes')
        .select('id,product_id,barcode,entry_mode,label')
        .eq('business_id', activeBusinessId),
    ]);

    if (stockLevels && activeProductRows) {
      const activeIds = new Set((activeProductRows as Array<{ id: string }>).map((row) => row.id));

      // Filter only active products that are low stock or out of stock (current_stock <= reorder_level)
      lowStockProducts = (stockLevels as ProductStockLevel[])
        .filter((p) => activeIds.has(p.id))
        .filter((p) => (p.current_stock ?? 0) <= (p.reorder_level ?? 0));
    }

    if (categoriesData) categories = categoriesData;
    if (suppliersData) suppliers = suppliersData;
    if (barcodesData) barcodes = barcodesData as ProductBarcode[];
  } catch (err) {
    console.error('Error loading low-stock products:', err);
  }

  const activeCategories = categories.filter((c) => c.is_active);
  const activeSuppliers = suppliers.filter((s) => s.is_active);

  return (
    <LowStockTable
      products={lowStockProducts}
      allCategories={categories}
      allSuppliers={suppliers}
      activeCategories={activeCategories}
      activeSuppliers={activeSuppliers}
      barcodes={barcodes}
    />
  );
}

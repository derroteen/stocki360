import { redirect } from 'next/navigation';
import ProductsTable from './ProductsTable';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductStockLevel, Category, Supplier, ProductBarcode } from '@/lib/supabase/types';
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
  let categories: Category[] = [];
  let suppliers: Supplier[] = [];
  let barcodes: ProductBarcode[] = [];

  try {
    const [
      { data: stockLevels },
      { data: productStates },
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
        .select('id,is_active')
        .eq('business_id', activeBusinessId),
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

    if (categoriesData) {
      categories = categoriesData;
    }
    
    if (suppliersData) {
      suppliers = suppliersData;
    }

    if (barcodesData) {
      barcodes = barcodesData as ProductBarcode[];
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }

  // Pass ALL categories/suppliers for table column display (so archived ones still show on existing products)
  // and ACTIVE-only lists to the product modal dropdowns so archived items can't be selected.
  const activeCategories = categories.filter((c) => c.is_active);
  const activeSuppliers = suppliers.filter((s) => s.is_active);

  return (
    <ProductsTable
      active={activeProducts}
      archived={archivedProducts}
      allCategories={categories}
      allSuppliers={suppliers}
      activeCategories={activeCategories}
      activeSuppliers={activeSuppliers}
      barcodes={barcodes}
    />
  );
}

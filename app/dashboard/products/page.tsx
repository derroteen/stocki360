import ProductsTable from './ProductsTable';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductStockLevel } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  let initialProducts: ProductStockLevel[] = [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from('product_stock_levels').select('*');
    if (data) {
      initialProducts = data as ProductStockLevel[];
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }

  return (
    <main className="p-4 sm:p-8 min-h-screen bg-cream-100">
      <ProductsTable initial={initialProducts} />
    </main>
  );
}

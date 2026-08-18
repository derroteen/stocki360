import { redirect } from 'next/navigation';
import ProductsTable from './ProductsTable';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductStockLevel } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let initialProducts: ProductStockLevel[] = [];

  try {
    const { data } = await supabase.from('product_stock_levels').select('*');
    if (data) {
      initialProducts = data as ProductStockLevel[];
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }

  return (
    <main className="p-4 sm:p-8 min-h-screen bg-white">
      <ProductsTable initial={initialProducts} />
    </main>
  );
}

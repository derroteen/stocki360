import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductStockLevel } from '@/lib/supabase/types';
import OverviewChart from './OverviewChart';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let products: ProductStockLevel[] = [];

  try {
    const { data } = await supabase.from('product_stock_levels').select('*');
    if (data) {
      products = data as ProductStockLevel[];
    }
  } catch (err) {
    console.error('Error fetching dashboard stock levels:', err);
  }

  const totalProducts = products.length;
  const totalStockValue = products.reduce(
    (acc, p) => acc + (p.current_stock ?? 0) * (p.sell_price ?? 0),
    0
  );
  const lowStockCount = products.filter((p) => p.is_low_stock).length;

  const formattedStockValue = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(totalStockValue);

  return (
    <div className="space-y-8">
      {/* Overview Heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 font-serif">
          Overview
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Snapshot of your business stock levels, valuation, and alerts.
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Products */}
        <div className="bg-surface border border-slate-200 rounded-xl p-5 sm:p-6 space-y-2 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Total Products
          </span>
          <div className="text-3xl font-bold text-ink-900 font-serif">
            {totalProducts}
          </div>
        </div>

        {/* Stock Value */}
        <div className="bg-surface border border-slate-200 rounded-xl p-5 sm:p-6 space-y-2 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Stock Value
          </span>
          <div className="text-3xl font-bold text-ink-900 font-serif">
            {formattedStockValue}
          </div>
        </div>

        {/* Low Stock Items */}
        <div
          className={`rounded-xl p-5 sm:p-6 space-y-2 shadow-2xs border ${
            lowStockCount > 0
              ? 'bg-warn-100 border-warn-600/30 text-warn-700'
              : 'bg-good-100 border-good-600/30 text-good-700'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Low Stock Items
          </span>
          <div className="text-3xl font-bold font-serif">{lowStockCount}</div>
        </div>
      </div>

      {/* Bar Chart Section or Empty State */}
      <div className="bg-surface border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink-900 font-serif">
              Stock Levels per Product
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Visual comparison of units in stock. Amber bars indicate low stock items.
            </p>
          </div>
        </div>

        {totalProducts === 0 ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-500 border border-accent-100 flex items-center justify-center mx-auto text-xl font-serif font-bold">
              📊
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-ink-900 font-serif">
                No products yet
              </h3>
              <p className="text-sm text-ink-500 max-w-sm mx-auto">
                Add your first product to see your dashboard chart.
              </p>
            </div>
            <Link
              href="/dashboard/products"
              className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
            >
              Go to Products
            </Link>
          </div>
        ) : (
          <OverviewChart data={products} />
        )}
      </div>
    </div>
  );
}

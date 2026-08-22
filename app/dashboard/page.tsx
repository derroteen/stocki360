import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductStockLevel } from '@/lib/supabase/types';
import OverviewChart from './OverviewChart';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';
import { getStockStatus, prioritizeLowStockProducts } from '@/lib/stock-alerts';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
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
    redirect('/dashboard/select-business');
  }

  if (!resolution.context && resolution.needsSelection) {
    redirect('/dashboard/select-business');
  }

  if (!resolution.context) {
    redirect('/login');
  }

  const activeBusinessId = resolution.context.businessId;

  let products: ProductStockLevel[] = [];

  try {
    // Single consolidated query using the security-invoker product_stock_levels view
    const [{ data: stockLevels }, { data: activeProducts }] = await Promise.all([
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

    if (stockLevels) {
      const activeIds = new Set((activeProducts ?? []).map((row: { id: string }) => row.id));
      products = (stockLevels as ProductStockLevel[]).filter((p) => activeIds.has(p.id));
    }
  } catch (err) {
    console.error('Error fetching dashboard stock levels:', err);
  }

  const totalProducts = products.length;
  const totalStockValue = products.reduce(
    (acc, p) => acc + (p.current_stock ?? 0) * (p.sell_price ?? 0),
    0
  );

  // Classify products needing attention (current_stock <= reorder_level)
  const lowStockAndOutProducts = products.filter(
    (p) => (p.current_stock ?? 0) <= (p.reorder_level ?? 0)
  );

  const outOfStockCount = lowStockAndOutProducts.filter(
    (p) => getStockStatus(p.current_stock ?? 0, p.reorder_level ?? 0) === 'out_of_stock'
  ).length;

  const lowStockOnlyCount = lowStockAndOutProducts.length - outOfStockCount;

  // Prioritize list: Out of stock first, then highest deficit ratio relative to reorder level
  const prioritizedAlerts = prioritizeLowStockProducts(lowStockAndOutProducts);
  const displayedAlerts = prioritizedAlerts.slice(0, 5);

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
        <Link
          href="/dashboard/products/low-stock"
          className={`rounded-xl p-5 sm:p-6 space-y-2 shadow-2xs border block transition-all hover:shadow-sm ${
            lowStockAndOutProducts.length > 0
              ? outOfStockCount > 0
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-warn-100 border-warn-600/30 text-warn-700'
              : 'bg-good-100 border-good-600/30 text-good-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Stock Alerts
            </span>
            <span className="text-xs font-medium opacity-80">View all →</span>
          </div>
          <div className="text-3xl font-bold font-serif">{lowStockAndOutProducts.length}</div>
          {lowStockAndOutProducts.length > 0 ? (
            <p className="text-xs opacity-90 font-medium">
              {outOfStockCount > 0 && `${outOfStockCount} out of stock`}
              {outOfStockCount > 0 && lowStockOnlyCount > 0 && ' • '}
              {lowStockOnlyCount > 0 && `${lowStockOnlyCount} low stock`}
            </p>
          ) : (
            <p className="text-xs opacity-90 font-medium">All items healthy</p>
          )}
        </Link>
      </div>

      {/* Main Grid: Stock Alerts Section + Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low-Stock & Out-of-Stock Alert Card */}
        <div className="lg:col-span-1 bg-surface border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-ink-900 font-serif flex items-center gap-2">
                  <span>Stock Alerts</span>
                  {lowStockAndOutProducts.length > 0 && (
                    <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-warn-100 text-warn-700 border border-warn-600/30">
                      {lowStockAndOutProducts.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  Items requiring replenishment.
                </p>
              </div>
            </div>

            {lowStockAndOutProducts.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-good-100 text-good-700 border border-good-600/30 flex items-center justify-center mx-auto text-lg font-bold">
                  ✓
                </div>
                <h3 className="text-sm font-semibold text-ink-900">
                  All products are sufficiently stocked.
                </h3>
                <p className="text-xs text-ink-500 max-w-xs mx-auto">
                  No active products are currently below their reorder threshold.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedAlerts.map((product) => {
                  const status = getStockStatus(
                    product.current_stock ?? 0,
                    product.reorder_level ?? 0
                  );
                  const isOutOfStock = status === 'out_of_stock';

                  return (
                    <Link
                      key={product.id}
                      href="/dashboard/products/low-stock"
                      className="py-3 flex items-start justify-between gap-3 group hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {isOutOfStock ? (
                            <span className="text-red-600 text-xs">🔴</span>
                          ) : (
                            <span className="text-amber-500 text-xs">⚠️</span>
                          )}
                          <span className="font-semibold text-sm text-ink-900 truncate group-hover:text-accent-600 transition-colors">
                            {product.name}
                          </span>
                        </div>
                        <p className="text-xs text-ink-500 pl-4">
                          Reorder level: {product.reorder_level ?? 0}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {isOutOfStock ? (
                          <span className="inline-block text-xs font-bold text-red-600 uppercase tracking-tight">
                            OUT OF STOCK
                          </span>
                        ) : (
                          <span className="inline-block text-xs font-semibold text-amber-800">
                            {product.current_stock ?? 0} units left
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {lowStockAndOutProducts.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <Link
                href="/dashboard/products/low-stock"
                className="text-xs font-semibold text-accent-600 hover:text-accent-700 flex items-center justify-between group min-h-[36px]"
              >
                <span>View all {lowStockAndOutProducts.length} low-stock products</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Stock Chart Section */}
        <div className="lg:col-span-2 bg-surface border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
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
    </div>
  );
}

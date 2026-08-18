'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardNav() {
  const pathname = usePathname();

  const isDashboardActive = pathname === '/dashboard';
  const isProductsActive = pathname.startsWith('/dashboard/products');

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-bold font-serif text-accent-600 tracking-tight">
            Stocki360
          </span>
        </Link>

        {/* Navigation Pills */}
        <nav className="flex items-center p-1 bg-slate-100/80 rounded-full border border-slate-200/80 text-xs sm:text-sm font-medium">
          <Link
            href="/dashboard"
            className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
              isDashboardActive
                ? 'bg-accent-50 text-accent-700 font-semibold border border-accent-100 shadow-2xs'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/products"
            className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
              isProductsActive
                ? 'bg-accent-50 text-accent-700 font-semibold border border-accent-100 shadow-2xs'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            Products
          </Link>
        </nav>

        {/* User Icon Circle */}
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent-50 text-accent-700 border border-accent-100 flex items-center justify-center font-bold text-xs sm:text-sm font-serif shadow-2xs">
            U
          </div>
        </div>
      </div>
    </header>
  );
}

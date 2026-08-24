'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function toInitial(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : null;
}

function resolveAvatarInitial(user: User | null): string {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    typeof metadata?.display_name === 'string'
      ? metadata.display_name
      : typeof metadata?.full_name === 'string'
      ? metadata.full_name
      : typeof metadata?.name === 'string'
      ? metadata.name
      : null;

  // Fallback order: display name initial, then email initial, then a stable default.
  return toInitial(displayName) ?? toInitial(user?.email) ?? 'U';
}

export default function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [avatarInitial, setAvatarInitial] = useState('U');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isDashboardActive = pathname === '/dashboard';
  const isProductsActive = pathname.startsWith('/dashboard/products');
  const isPurchasesActive = pathname.startsWith('/dashboard/purchases');
  const isCategoriesActive = pathname.startsWith('/dashboard/categories');
  const isSuppliersActive = pathname.startsWith('/dashboard/suppliers');
  const isSalesActive = pathname.startsWith('/dashboard/sales');

  useEffect(() => {
    let isMounted = true;

    const loadUserInitial = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setAvatarInitial(resolveAvatarInitial(user));
    };

    loadUserInitial();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAvatarInitial(resolveAvatarInitial(session?.user ?? null));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setLogoutError(null);
    setIsLoggingOut(true);

    // Sign out with Supabase to clear the authenticated session for this browser.
    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutError(error.message || 'Unable to log out. Please try again.');
      setIsLoggingOut(false);
      return;
    }

    setAvatarInitial('U');

    // Refresh auth-sensitive server components after redirecting to the login page.
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-bold font-serif text-accent-600 tracking-tight">
            Stocki360
          </span>
        </Link>

        {/* Desktop Navigation Pills */}
        <nav className="hidden md:flex items-center p-1 bg-slate-100/80 rounded-full border border-slate-200/80 text-xs sm:text-sm font-medium">
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
          <Link
            href="/dashboard/purchases"
            className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
              isPurchasesActive
                ? 'bg-accent-50 text-accent-700 font-semibold border border-accent-100 shadow-2xs'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            Purchases
          </Link>
          <Link
            href="/dashboard/sales"
            className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
              isSalesActive
                ? 'bg-accent-50 text-accent-700 font-semibold border border-accent-100 shadow-2xs'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            Sales
          </Link>
          <Link
            href="/dashboard/categories"
            className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
              isCategoriesActive
                ? 'bg-accent-50 text-accent-700 font-semibold border border-accent-100 shadow-2xs'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            Categories
          </Link>
          <Link
            href="/dashboard/suppliers"
            className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
              isSuppliersActive
                ? 'bg-accent-50 text-accent-700 font-semibold border border-accent-100 shadow-2xs'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            Suppliers
          </Link>
        </nav>

        {/* Desktop User controls */}
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="min-h-[36px] px-3 rounded-lg border border-slate-300 text-xs sm:text-sm font-medium text-ink-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </button>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent-50 text-accent-700 border border-accent-100 flex items-center justify-center font-bold text-xs sm:text-sm font-serif shadow-2xs">
            {avatarInitial}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 text-ink-600 hover:text-ink-900 transition-colors -mr-2"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
            <span className="text-lg font-bold font-serif text-accent-600 tracking-tight">
              Stocki360
            </span>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-ink-600 hover:text-ink-900 transition-colors -mr-2"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            <nav className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                  isDashboardActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-ink-600 active:bg-slate-50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                  isProductsActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-ink-600 active:bg-slate-50'
                }`}
              >
                Products
              </Link>
              <Link
                href="/dashboard/purchases"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                  isPurchasesActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-ink-600 active:bg-slate-50'
                }`}
              >
                Purchases
              </Link>
              <Link
                href="/dashboard/sales"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                  isSalesActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-ink-600 active:bg-slate-50'
                }`}
              >
                Sales
              </Link>
              <Link
                href="/dashboard/categories"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                  isCategoriesActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-ink-600 active:bg-slate-50'
                }`}
              >
                Categories
              </Link>
              <Link
                href="/dashboard/suppliers"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                  isSuppliersActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-ink-600 active:bg-slate-50'
                }`}
              >
                Suppliers
              </Link>
            </nav>

            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-10 h-10 rounded-full bg-accent-50 text-accent-700 border border-accent-100 flex items-center justify-center font-bold text-sm font-serif shadow-2xs">
                  {avatarInitial}
                </div>
                <div className="text-sm font-medium text-ink-900">
                  Account
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                disabled={isLoggingOut}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-warn-700 active:bg-warn-50 transition-colors"
              >
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {logoutError ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-2">
          <p className="text-xs sm:text-sm text-warn-700">{logoutError}</p>
        </div>
      ) : null}
    </header>
  );
}
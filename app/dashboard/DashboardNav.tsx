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

  const isDashboardActive = pathname === '/dashboard';
  const isProductsActive = pathname.startsWith('/dashboard/products');
  const isCategoriesActive = pathname.startsWith('/dashboard/categories');
  const isSuppliersActive = pathname.startsWith('/dashboard/suppliers');

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

        {/* User controls */}
        <div className="flex items-center gap-2">
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
      </div>
      {logoutError ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-2">
          <p className="text-xs sm:text-sm text-warn-700">{logoutError}</p>
        </div>
      ) : null}
    </header>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthAwareActionsVariant = "header" | "hero" | "footer";

const focusClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export default function AuthAwareActions({
  variant,
}: {
  variant: AuthAwareActionsVariant;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let authChanged = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      authChanged = true;
      setIsSignedIn(Boolean(session));
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Unable to check the current Supabase session:", error.message);
          return;
        }

        if (isMounted && !authChanged) {
          setIsSignedIn(Boolean(data.session));
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to check the current Supabase session:", error);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (variant === "header") {
    return (
      <div className="min-w-[148px] text-right">
        {isSignedIn ? (
          <Link
            href="/dashboard"
            className={`inline-flex min-h-[40px] items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-subtle ${focusClasses}`}
          >
            Open Dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className={`inline-flex min-h-[40px] items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-subtle ${focusClasses}`}
          >
            Sign In
          </Link>
        )}
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="landing-actions flex min-h-[108px] flex-col gap-3 pt-2 sm:min-h-[52px] sm:flex-row">
        {isSignedIn ? (
          <Link
            href="/dashboard"
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 sm:min-w-[180px] ${focusClasses}`}
          >
            Open Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className={`inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 ${focusClasses}`}
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-line-strong px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-subtle ${focusClasses}`}
            >
              Sign In
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[40px] min-w-[190px] items-center justify-center gap-3 sm:justify-end">
      {isSignedIn ? (
        <Link
          href="/dashboard"
          className={`inline-flex min-h-[40px] min-w-[190px] items-center justify-center rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700 ${focusClasses}`}
        >
          Open Dashboard
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            className={`inline-flex min-h-[40px] items-center justify-center rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700 ${focusClasses}`}
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className={`inline-flex min-h-[40px] items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-subtle ${focusClasses}`}
          >
            Sign In
          </Link>
        </>
      )}
    </div>
  );
}

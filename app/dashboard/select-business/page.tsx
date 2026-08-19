import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';

export const dynamic = 'force-dynamic';

export default async function SelectBusinessPage() {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context && resolution.memberships.length === 0) {
    return (
      <div className="min-h-screen bg-white text-ink-900 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-surface p-6 sm:p-8 shadow-2xs space-y-3">
          <h1 className="font-serif text-2xl font-bold text-ink-900">No business access yet</h1>
          <p className="text-sm text-ink-600">
            Your account is authenticated but does not have an active business membership.
            Ask an owner or admin to grant access.
          </p>
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink-700 hover:bg-slate-50"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (resolution.context) {
    redirect('/dashboard');
  }

  if (resolution.memberships.length === 1) {
    const only = resolution.memberships[0];
    redirect(`/api/active-business?businessId=${encodeURIComponent(only.business_id)}&next=/dashboard`);
  }

  return (
    <div className="min-h-screen bg-white text-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-surface p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-bold text-ink-900">Select Business</h1>
          <p className="text-sm text-ink-600">
            Choose the business you want to work with for this session.
          </p>
        </div>

        <div className="space-y-3">
          {resolution.memberships.map((membership) => {
            const businessName = membership.businesses?.name ?? 'Business';
            return (
              <Link
                key={membership.id}
                href={`/api/active-business?businessId=${encodeURIComponent(membership.business_id)}&next=/dashboard`}
                className="w-full min-h-[44px] px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between"
              >
                <span className="font-medium text-ink-900">{businessName}</span>
                <span className="text-xs uppercase tracking-wider text-ink-500">{membership.role}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { ReactNode } from 'react';
import type { Metadata } from 'next';
import DashboardNav from './DashboardNav';
import InvitationBanner from './InvitationBanner';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveBusinessResolution } from '@/lib/supabase/business-context';
import { BRAND_COMPANY_NAME, BRAND_CONTACT_EMAIL } from '@/lib/brand';

export async function generateMetadata(): Promise<Metadata> {
  const resolution = await getActiveBusinessResolution();
  const activeMembership = resolution.context
    ? resolution.memberships.find(
        (membership) => membership.business_id === resolution.context?.businessId
      )
    : null;
  const businessName = activeMembership?.businesses?.name;

  return {
    title: {
      default: businessName ? `Dashboard · ${businessName}` : 'Dashboard',
      template: businessName ? `%s · ${businessName}` : '%s',
    },
  };
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [supabase, resolution] = await Promise.all([
    createSupabaseServerClient(),
    getActiveBusinessResolution(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const activeMembership = resolution.context
    ? resolution.memberships.find(
        (membership) => membership.business_id === resolution.context?.businessId
      )
    : null;
  const businessName = activeMembership?.businesses?.name ?? null;
  const role = resolution.context?.role ?? null;
  const canSwitch = resolution.memberships.length > 1;

  let invitation: { id: string; role: string; businessName: string } | null = null;

  if (user?.email) {
    const { data } = await supabase
      .from('business_invitations')
      .select('id,role,businesses(name)')
      .ilike('email', user.email)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    const business = Array.isArray(data?.businesses) ? data.businesses[0] : data?.businesses;
    if (data && business?.name) {
      invitation = { id: data.id, role: data.role, businessName: business.name };
    }
  }

  return (
    <div className="min-h-screen bg-page text-ink-900 flex flex-col">
      {invitation && (
        <InvitationBanner
          invitationId={invitation.id}
          businessName={invitation.businessName}
          role={invitation.role}
        />
      )}
      <DashboardNav businessName={businessName} role={role} canSwitch={canSwitch} />
      <main className="min-w-0 flex-1 max-w-6xl w-full mx-auto overflow-x-clip px-4 sm:px-6 py-8">
        {children}
      </main>
      <footer className="w-full border-t border-line px-4 py-4 text-center text-xs text-ink-500 sm:px-6">
        <p>
          Powered by {BRAND_COMPANY_NAME}{" "}
          <a
            href={`mailto:${BRAND_CONTACT_EMAIL}`}
            className="underline decoration-transparent underline-offset-2 transition-colors hover:text-accent-600 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
          >
            {BRAND_CONTACT_EMAIL}
          </a>
        </p>
      </footer>
    </div>
  );
}

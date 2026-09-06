import { ReactNode } from 'react';
import DashboardNav from './DashboardNav';
import InvitationBanner from './InvitationBanner';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    <div className="min-h-screen bg-white text-ink-900 flex flex-col">
      {invitation && (
        <InvitationBanner
          invitationId={invitation.id}
          businessName={invitation.businessName}
          role={invitation.role}
        />
      )}
      <DashboardNav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}

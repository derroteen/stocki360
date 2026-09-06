import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveBusinessContext, BusinessRole } from '@/lib/supabase/business-context';
import InviteModal from './InviteModal';
import RevokeButton from './RevokeButton';

export const dynamic = 'force-dynamic';

interface TeamMember {
  id: string;
  role: BusinessRole;
  email: string | null;
  is_active: boolean;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: Exclude<BusinessRole, 'owner'>;
  expires_at: string;
}

const roleLabels: Record<BusinessRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  storekeeper: 'Storekeeper',
  cashier: 'Cashier',
};

function RoleBadge({ role }: { role: BusinessRole }) {
  const styles: Record<BusinessRole, string> = {
    owner: 'bg-ink-900 text-white',
    admin: 'bg-accent-50 text-accent-700 border border-accent-200',
    storekeeper: 'bg-green-50 text-green-700 border border-green-200',
    cashier: 'bg-slate-100 text-ink-700 border border-slate-200',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[role]}`}>
      {roleLabels[role]}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export default async function TeamPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context && (resolution.memberships.length === 0 || resolution.needsSelection)) {
    redirect('/dashboard/select-business');
  }

  if (!resolution.context) {
    redirect('/login');
  }

  const activeBusinessId = resolution.context.businessId;
  const canManageTeam = resolution.context.role === 'owner' || resolution.context.role === 'admin';

  const [{ data: membersData }, { data: invitationsData }] = await Promise.all([
    supabase
      .from('business_memberships')
      .select('id,role,email,is_active')
      .eq('business_id', activeBusinessId)
      .order('role', { ascending: true }),
    canManageTeam
      ? supabase
          .from('business_invitations')
          .select('id,email,role,expires_at')
          .eq('business_id', activeBusinessId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as PendingInvitation[] }),
  ]);

  const members = (membersData ?? []) as TeamMember[];
  const invitations = (invitationsData ?? []) as PendingInvitation[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">Workspace</p>
          <h1 className="mt-1 text-3xl font-bold font-serif text-ink-900">Team</h1>
          <p className="mt-2 text-sm text-ink-600">Manage the people who can work in this business.</p>
        </div>
        {canManageTeam && <InviteModal businessId={activeBusinessId} />}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold font-serif text-ink-900">Members</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-4 font-medium text-ink-900">{member.email ?? 'No email recorded'}</td>
                    <td className="px-4 py-4"><RoleBadge role={member.role} /></td>
                    <td className="px-4 py-4 text-ink-600">{member.is_active ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {canManageTeam && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold font-serif text-ink-900">Pending invitations</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            {invitations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-500">No pending invitations.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Expires</th>
                      <th className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((invitation) => (
                      <tr key={invitation.id}>
                        <td className="px-4 py-4 font-medium text-ink-900">{invitation.email}</td>
                        <td className="px-4 py-4"><RoleBadge role={invitation.role} /></td>
                        <td className="px-4 py-4 text-ink-600">{formatDate(invitation.expires_at)}</td>
                        <td className="px-4 py-4 text-right"><RevokeButton invitationId={invitation.id} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

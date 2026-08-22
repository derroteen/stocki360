import { redirect } from 'next/navigation';
import SuppliersTable from './SuppliersTable';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('business_id', resolution.context.businessId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching suppliers:', error);
  }

  return <SuppliersTable suppliers={suppliers || []} />;
}

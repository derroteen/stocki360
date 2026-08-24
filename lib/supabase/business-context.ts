import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';

export type BusinessRole = 'owner' | 'admin' | 'storekeeper' | 'cashier';

export interface BusinessMembership {
  id: string;
  business_id: string;
  role: BusinessRole;
  is_active: boolean;
  businesses?: {
    id: string;
    name: string;
  } | null;
}

export interface ActiveBusinessContext {
  userId: string;
  membershipId: string;
  businessId: string;
  role: BusinessRole;
}

export interface ActiveBusinessResolution {
  context: ActiveBusinessContext | null;
  memberships: BusinessMembership[];
  needsSelection: boolean;
}

export const PRODUCT_WRITE_ROLES: BusinessRole[] = ['owner', 'admin', 'storekeeper'];

export async function resolveActiveBusinessContext(
  supabase: SupabaseClient
): Promise<ActiveBusinessResolution> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { context: null, memberships: [], needsSelection: false };
  }

  const { data, error } = await supabase
    .from('business_memberships')
    .select('id,business_id,role,is_active,businesses(id,name)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  const memberships = ((data ?? []) as Array<{
    id: string;
    business_id: string;
    role: BusinessRole;
    is_active: boolean;
    businesses?: Array<{ id: string; name: string }> | null;
  }>).map((row) => ({
    id: row.id,
    business_id: row.business_id,
    role: row.role,
    is_active: row.is_active,
    businesses: row.businesses?.[0] ?? null,
  }));

  if (memberships.length === 0) {
    return { context: null, memberships, needsSelection: false };
  }

  if (memberships.length === 1) {
    const only = memberships[0];
    return {
      context: {
        userId: user.id,
        membershipId: only.id,
        businessId: only.business_id,
        role: only.role,
      },
      memberships,
      needsSelection: false,
    };
  }

  const cookieStore = await cookies();
  const activeBusinessId = cookieStore.get('active_business_id')?.value;

  if (!activeBusinessId) {
    return { context: null, memberships, needsSelection: true };
  }

  const activeMembership = memberships.find((m) => m.business_id === activeBusinessId);

  if (!activeMembership) {
    return { context: null, memberships, needsSelection: true };
  }

  return {
    context: {
      userId: user.id,
      membershipId: activeMembership.id,
      businessId: activeMembership.business_id,
      role: activeMembership.role,
    },
    memberships,
    needsSelection: false,
  };
}

export function canWriteProducts(role: BusinessRole): boolean {
  return PRODUCT_WRITE_ROLES.includes(role);
}

// --- Add to lib/supabase/business-context.ts, near PRODUCT_WRITE_ROLES ---

export const SALE_WRITE_ROLES: BusinessRole[] = ['owner', 'admin', 'storekeeper', 'cashier'];

export function canWriteSales(role: BusinessRole): boolean {
  return SALE_WRITE_ROLES.includes(role);
}
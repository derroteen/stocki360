import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

type SupplierPayload = {
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

function toNonEmptyTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateSupplierInput(body: unknown): SupplierPayload {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const name = toNonEmptyTrimmedString(record.name);
  if (!name) {
    throw new Error('Supplier name is required.');
  }

  const email = toNonEmptyTrimmedString(record.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format.');
  }

  return {
    name,
    contact_person: toNonEmptyTrimmedString(record.contact_person),
    phone: toNonEmptyTrimmedString(record.phone),
    email,
    address: toNonEmptyTrimmedString(record.address),
    notes: toNonEmptyTrimmedString(record.notes),
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to create suppliers.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  let parsed: SupplierPayload;
  try {
    parsed = validateSupplierInput(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const payload = {
    ...parsed,
    business_id: resolution.context.businessId,
  };

  const { error } = await supabase.from('suppliers').insert([payload]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

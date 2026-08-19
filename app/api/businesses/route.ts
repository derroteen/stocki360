import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Business name is required.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('create_business_with_owner', {
    p_name: name,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const createdBusinessId = Array.isArray(data) ? data[0]?.business_id : null;

  if (!createdBusinessId) {
    return NextResponse.json({ error: 'Unable to create business.' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, businessId: createdBusinessId });
  response.cookies.set({
    name: 'active_business_id',
    value: createdBusinessId,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

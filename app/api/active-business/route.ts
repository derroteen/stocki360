import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return '/dashboard';

  if (!raw.startsWith('/')) return '/dashboard';
  if (raw.startsWith('//')) return '/dashboard';
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)) return '/dashboard';

  return raw;
}

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId');
  const next = sanitizeNextPath(request.nextUrl.searchParams.get('next'));

  if (!businessId) {
    return NextResponse.redirect(new URL('/dashboard/select-business', request.url));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: membership, error } = await supabase
    .from('business_memberships')
    .select('id,business_id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .single();

  if (error || !membership) {
    return NextResponse.redirect(new URL('/dashboard/select-business', request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set({
    name: 'active_business_id',
    value: businessId,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

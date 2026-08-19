import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to edit products.' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const payload = {
    sku: String(body?.sku ?? '').trim(),
    name: String(body?.name ?? '').trim(),
    cost_price: Number(body?.cost_price ?? 0),
    sell_price: Number(body?.sell_price ?? 0),
    reorder_level: Number(body?.reorder_level ?? 0),
  };

  if (!payload.sku || !payload.name) {
    return NextResponse.json({ error: 'SKU and name are required.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .eq('business_id', resolution.context.businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to archive products.' }, { status: 403 });
  }

  const { id } = await context.params;

  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .eq('business_id', resolution.context.businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

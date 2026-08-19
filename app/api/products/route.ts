import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to create products.' }, { status: 403 });
  }

  const body = await request.json();
  const payload = {
    sku: String(body?.sku ?? '').trim(),
    name: String(body?.name ?? '').trim(),
    cost_price: Number(body?.cost_price ?? 0),
    sell_price: Number(body?.sell_price ?? 0),
    reorder_level: Number(body?.reorder_level ?? 0),
    business_id: resolution.context.businessId,
    is_active: true,
  };

  if (!payload.sku || !payload.name) {
    return NextResponse.json({ error: 'SKU and name are required.' }, { status: 400 });
  }

  const { error } = await supabase.from('products').insert([payload]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

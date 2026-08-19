import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

const allowedMovementTypes = new Set(['in', 'out', 'adjustment']);

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to record stock movement.' }, { status: 403 });
  }

  const body = await request.json();
  const productId = String(body?.productId ?? '').trim();
  const movementType = String(body?.movementType ?? '').trim();
  const quantity = Number(body?.quantity ?? 0);
  const note = body?.note ? String(body.note).trim() : null;

  if (!productId || !allowedMovementTypes.has(movementType) || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Invalid stock movement payload.' }, { status: 400 });
  }

  const { data: product, error: productErr } = await supabase
    .from('products')
    // Archived products are read-only history and cannot receive new stock movements.
    .select('id,business_id,is_active')
    .eq('id', productId)
    .eq('business_id', resolution.context.businessId)
    .single();

  if (productErr || !product) {
    return NextResponse.json({ error: 'Product not found for active business.' }, { status: 404 });
  }

  if (!product.is_active) {
    return NextResponse.json({ error: 'Archived products cannot receive new stock movements.' }, { status: 400 });
  }

  const { error: insertErr } = await supabase
    .from('stock_movements')
    .insert([
      {
        product_id: productId,
        movement_type: movementType,
        quantity,
        note,
      },
    ]);

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

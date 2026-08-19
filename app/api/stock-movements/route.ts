import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

const allowedMovementTypes = new Set(['in', 'out', 'adjustment']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  let body: Record<string, unknown>;
  try {
    // Handle malformed request bodies explicitly so invalid client JSON returns a controlled 400.
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const productId = String(body?.productId ?? '').trim();
  const movementType = String(body?.movementType ?? '').trim();
  const quantity = Number(body?.quantity ?? 0);
  const note = body?.note ? String(body.note).trim() : null;
  const idempotencyKey = String(body?.idempotencyKey ?? '').trim();

  if (
    !productId ||
    !allowedMovementTypes.has(movementType) ||
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return NextResponse.json({ error: 'Invalid stock movement payload.' }, { status: 400 });
  }

  if (!uuidPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Invalid idempotency key.' }, { status: 400 });
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

  // Delegate stock availability checks + movement insert to one DB transaction
  // so concurrent stock-out requests cannot pass stale application-side checks.
  // The idempotency key ensures network retries of one logical submission are not double-recorded.
  const { error: movementErr } = await supabase.rpc('record_stock_movement', {
    p_product_id: productId,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_note: note,
    p_idempotency_key: idempotencyKey,
  });

  if (movementErr) {
    if (movementErr.message?.toLowerCase().includes('insufficient stock')) {
      return NextResponse.json({ error: 'Insufficient stock.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to record stock movement.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

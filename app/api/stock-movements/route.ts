import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  resolveActiveBusinessContext,
} from '@/lib/supabase/business-context';
import { MANUAL_ADJUSTMENT_ROLES, OPENING_STOCK_ROLES } from '@/lib/supabase/stock-roles';

const allowedKinds = new Set(['opening', 'write_off', 'count']);
const reasonCodes = new Set(['damaged', 'expired', 'lost', 'own_use', 'supplier_return', 'other']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const databaseErrors: Record<string, { error: string; field?: string; status: number }> = {
  'Opening stock quantity must be greater than zero.': {
    error: 'Opening stock must be greater than zero.',
    field: 'quantity',
    status: 400,
  },
  'Opening stock can only be recorded for a product with no movements.': {
    error: 'Opening stock has already been recorded for this product.',
    field: 'quantity',
    status: 409,
  },
  'Only an owner, admin, or storekeeper may record opening stock.': {
    error: 'Only an owner, admin, or storekeeper may record opening stock.',
    status: 403,
  },
  'Only an owner or admin may record a write-off.': {
    error: 'Only an owner or admin may record a write-off.',
    status: 403,
  },
  'Only an owner or admin may record a stock count.': {
    error: 'Only an owner or admin may record a stock count.',
    status: 403,
  },
  'A valid reason code is required for write-offs.': {
    error: 'Choose a valid reason for the write-off.',
    field: 'reason_code',
    status: 400,
  },
  'A non-empty note is required for write-offs with reason lost or other.': {
    error: 'Add a note for write-offs marked lost or other.',
    field: 'note',
    status: 400,
  },
  'Write-off quantity must be greater than zero.': {
    error: 'Write-off quantity must be greater than zero.',
    field: 'quantity',
    status: 400,
  },
  'Write-off quantity exceeds current stock.': {
    error: 'Write-off quantity cannot exceed current stock.',
    field: 'quantity',
    status: 400,
  },
  'A note is required when a stock count changes the quantity.': {
    error: 'Add a note explaining why the stock count differs.',
    field: 'note',
    status: 400,
  },
  'Quantity cannot be negative': {
    error: 'Quantity cannot be negative.',
    field: 'quantity',
    status: 400,
  },
  'Archived products cannot receive new stock movements.': {
    error: 'Archived products cannot receive new stock movements.',
    status: 400,
  },
  'Product not found for active business.': {
    error: 'Product not found for the active business.',
    status: 404,
  },
  'Idempotency key is required': {
    error: 'A valid request key is required. Please retry.',
    status: 400,
  },
};

function fieldError(error: string, field: string, status = 400) {
  return NextResponse.json({ error, field }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const productId = String(body?.productId ?? '').trim();
  const kind = String(body?.kind ?? '').trim();
  const quantity = Number(body?.quantity);
  const reasonCode = body?.reason_code == null ? null : String(body.reason_code).trim();
  const note = body?.note == null ? null : String(body.note).trim();
  const idempotencyKey = String(body?.idempotencyKey ?? '').trim();

  if (!productId || !allowedKinds.has(kind)) {
    return NextResponse.json({ error: 'Choose opening, write-off, or stock count.' }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 0 || (kind !== 'count' && quantity === 0)) {
    return fieldError(kind === 'opening' ? 'Opening stock must be greater than zero.' : 'Enter a valid whole-number quantity.', 'quantity');
  }
  if (kind === 'write_off' && (!reasonCode || !reasonCodes.has(reasonCode))) {
    return fieldError('Choose a valid reason for the write-off.', 'reason_code');
  }
  if (kind === 'write_off' && ['lost', 'other'].includes(reasonCode ?? '') && !note) {
    return fieldError('Add a note for write-offs marked lost or other.', 'note');
  }
  if (!uuidPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Invalid idempotency key.' }, { status: 400 });
  }

  const role = resolution.context.role;
  if (kind === 'opening' && !OPENING_STOCK_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Only an owner, admin, or storekeeper may record opening stock.' }, { status: 403 });
  }
  if (kind !== 'opening' && !MANUAL_ADJUSTMENT_ROLES.includes(role)) {
    return NextResponse.json(
      { error: kind === 'write_off' ? 'Only an owner or admin may record a write-off.' : 'Only an owner or admin may record a stock count.' },
      { status: 403 },
    );
  }

  const { data: product, error: productErr } = await supabase
    .from('products')
    .select('id,business_id,is_active')
    .eq('id', productId)
    .eq('business_id', resolution.context.businessId)
    .single();

  if (productErr || !product) {
    return NextResponse.json({ error: 'Product not found for the active business.' }, { status: 404 });
  }
  if (!product.is_active) {
    return NextResponse.json({ error: 'Archived products cannot receive new stock movements.' }, { status: 400 });
  }

  const { error: movementErr } = await supabase.rpc('record_manual_stock_movement', {
    p_product_id: productId,
    p_kind: kind,
    p_quantity: quantity,
    p_reason_code: reasonCode,
    p_note: note,
    p_idempotency_key: idempotencyKey,
  });

  if (movementErr) {
    const mapped = databaseErrors[movementErr.message];
    if (mapped) {
      return NextResponse.json(
        { error: mapped.error, ...(mapped.field ? { field: mapped.field } : {}) },
        { status: mapped.status },
      );
    }

    console.error('Unable to record manual stock movement:', movementErr);
    return NextResponse.json({ error: 'Unable to record this stock change. Please try again.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

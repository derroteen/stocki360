import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type ProductPayload = {
  sku: string;
  name: string;
  cost_price: number;
  sell_price: number;
  reorder_level: number;
  category_id?: string | null;
  supplier_id?: string | null;
};

function toNonEmptyTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSku(value: unknown): string | null {
  const trimmed = toNonEmptyTrimmedString(value);
  return trimmed ? trimmed.toUpperCase() : null;
}

function toValidNonNegativeNumber(value: unknown, field: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
      ? Number(value)
      : Number.NaN;

  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a valid number.`);
  }

  if (parsed < 0) {
    throw new Error(`${field} must not be negative.`);
  }

  return parsed;
}

function toValidNonNegativeInteger(value: unknown, field: string): number {
  const parsed = toValidNonNegativeNumber(value, field);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${field} must be an integer.`);
  }

  return parsed;
}

function validateProductInput(body: unknown): ProductPayload {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const sku = normalizeSku(record.sku);
  const name = toNonEmptyTrimmedString(record.name);

  if (!sku) {
    throw new Error('SKU is required.');
  }

  if (!name) {
    throw new Error('Product name is required.');
  }

  return {
    sku,
    name,
    cost_price: toValidNonNegativeNumber(record.cost_price, 'Cost price'),
    sell_price: toValidNonNegativeNumber(record.sell_price, 'Sell price'),
    reorder_level: toValidNonNegativeInteger(record.reorder_level, 'Reorder level'),
    category_id: toNonEmptyTrimmedString(record.category_id),
    supplier_id: toNonEmptyTrimmedString(record.supplier_id),
  };
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  // Product writes are restricted to operational roles for tenant safety.
  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to edit products.' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  let payload: ProductPayload;
  try {
    payload = validateProductInput(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    // Scope by tenant and id so users cannot mutate products outside their active business.
    .eq('id', id)
    .eq('business_id', resolution.context.businessId)
    .select('id');

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A product with this SKU already exists in this business.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
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

  // Product writes are restricted to operational roles for tenant safety.
  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to archive products.' }, { status: 403 });
  }

  const { id } = await context.params;

  const { data, error } = await supabase
    .from('products')
    // Archive instead of hard-delete so historical references remain intact.
    .update({ is_active: false })
    // Scope by tenant and id so users cannot mutate products outside their active business.
    .eq('id', id)
    .eq('business_id', resolution.context.businessId)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(_request: NextRequest, context: RouteParams) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  // Product writes are restricted to operational roles for tenant safety.
  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to restore products.' }, { status: 403 });
  }

  const { id } = await context.params;

  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('id,is_active')
    .eq('id', id)
    .eq('business_id', resolution.context.businessId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  if (existing.is_active) {
    return NextResponse.json({ error: 'Product is already active.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('products')
    // Restore flips only is_active so the original product id and stock history remain intact.
    .update({ is_active: true })
    .eq('id', id)
    .eq('business_id', resolution.context.businessId)
    .eq('is_active', false)
    .select('id');

  if (error) {
    if (error.code === '23505') {
      // Conflicting active SKU is a business-rule conflict, not a generic bad request.
      return NextResponse.json(
        { error: 'Cannot restore product because this SKU is already used by another product in this business.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

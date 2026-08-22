import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

type ProductPayload = {
  sku: string;
  name: string;
  cost_price: number;
  sell_price: number;
  reorder_level: number;
  category_id?: string | null;
  supplier_id?: string | null;
  stock_unit: string;
  package_unit?: string | null;
  units_per_package?: number | null;
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

  const packageUnit = toNonEmptyTrimmedString(record.package_unit);
  let unitsPerPackage: number | null = null;
  if (packageUnit) {
    unitsPerPackage = toValidNonNegativeInteger(record.units_per_package, 'Units per package');
    if (unitsPerPackage <= 0) {
      throw new Error('Units per package must be greater than 0.');
    }
  }

  return {
    sku,
    name,
    cost_price: toValidNonNegativeNumber(record.cost_price, 'Cost price'),
    sell_price: toValidNonNegativeNumber(record.sell_price, 'Sell price'),
    reorder_level: toValidNonNegativeInteger(record.reorder_level, 'Reorder level'),
    category_id: toNonEmptyTrimmedString(record.category_id),
    supplier_id: toNonEmptyTrimmedString(record.supplier_id),
    stock_unit: toNonEmptyTrimmedString(record.stock_unit) || 'unit',
    package_unit: packageUnit,
    units_per_package: unitsPerPackage,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  // Product writes are restricted to operational roles for tenant safety.
  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to create products.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  let parsed: ProductPayload;
  try {
    parsed = validateProductInput(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const payload = {
    ...parsed,
    // Always bind writes to the active tenant from server context.
    business_id: resolution.context.businessId,
    is_active: true,
  };

  const { error } = await supabase.from('products').insert([payload]);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A product with this SKU already exists in this business.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

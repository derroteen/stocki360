import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

interface RouteParams {
  params: Promise<{ id: string }>;
}

type ProductPayload = {
  sku: string;
  // Legacy single-barcode column, superseded by product_barcodes. Only set
  // when the caller explicitly sends it, so the new barcode-list UI (which
  // never sends it) doesn't null out whatever was there before.
  barcode?: string | null;
  name: string;
  cost_price: number;
  sell_price: number;
  reorder_level: number;
  category_id?: string | null;
  supplier_id?: string | null;
  stock_unit: string;
  package_unit?: string | null;
  units_per_package?: number | null;
  package_cost_price?: number | null;
  package_sell_price?: number | null;
};

type BarcodeEntryMode = 'individual' | 'package';

type BarcodeInput = {
  barcode: string;
  entry_mode: BarcodeEntryMode;
  label: string | null;
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

function toValidNonNegativeNumberOrNull(value: unknown, field: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }

  return toValidNonNegativeNumber(value, field);
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

  const payload: ProductPayload = {
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
    package_cost_price: toValidNonNegativeNumberOrNull(record.package_cost_price, 'Package cost price'),
    package_sell_price: toValidNonNegativeNumberOrNull(record.package_sell_price, 'Package sell price'),
  };

  if (Object.prototype.hasOwnProperty.call(record, 'barcode')) {
    payload.barcode = toNonEmptyTrimmedString(record.barcode);
  }

  return payload;
}

// Skips blank rows and defaults an unrecognized entry_mode to 'individual'.
// Package-mode barcodes are rejected when the product has no packaging
// configured, so a scan can never resolve to an unsellable line.
function validateBarcodesInput(body: unknown, unitsPerPackage: number | null): BarcodeInput[] {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const raw = record.barcodes;

  if (raw === undefined || raw === null) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new Error('Barcodes must be a list.');
  }

  const result: BarcodeInput[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }

    const itemRecord = item as Record<string, unknown>;
    const barcode = toNonEmptyTrimmedString(itemRecord.barcode);
    if (!barcode) {
      continue;
    }

    const entryMode: BarcodeEntryMode = itemRecord.entry_mode === 'package' ? 'package' : 'individual';

    if (entryMode === 'package' && !unitsPerPackage) {
      throw new Error(`Barcode "${barcode}" is set to sell as a package, but this product has no package configured.`);
    }

    result.push({
      barcode,
      entry_mode: entryMode,
      label: toNonEmptyTrimmedString(itemRecord.label),
    });
  }

  return result;
}

function extractDuplicateBarcodeValue(details: string | null | undefined): string | null {
  if (!details) {
    return null;
  }

  const match = details.match(/=\([^,]+,\s*(.+?)\)\s*already exists\.?$/i);
  return match ? match[1] : null;
}

// Replaces this product's product_barcodes rows with the submitted list.
// business_id is always taken from the server-resolved context, never the client.
async function syncProductBarcodes(
  supabase: SupabaseServerClient,
  productId: string,
  businessId: string,
  barcodes: BarcodeInput[]
): Promise<NextResponse | null> {
  const { error: deleteError } = await supabase
    .from('product_barcodes')
    .delete()
    .eq('product_id', productId)
    .eq('business_id', businessId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  if (barcodes.length === 0) {
    return null;
  }

  const rows = barcodes.map((b) => ({
    business_id: businessId,
    product_id: productId,
    barcode: b.barcode,
    entry_mode: b.entry_mode,
    label: b.label,
  }));

  const { error: insertError } = await supabase.from('product_barcodes').insert(rows);

  if (insertError) {
    if (insertError.code === '23505') {
      const duplicateValue = extractDuplicateBarcodeValue(insertError.details);
      return NextResponse.json(
        {
          error: duplicateValue
            ? `The barcode "${duplicateValue}" is already used by another product in your business.`
            : 'One of these barcodes is already used by another product in your business.',
          code: insertError.code,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return null;
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

  let barcodes: BarcodeInput[];
  try {
    barcodes = validateBarcodesInput(body, payload.units_per_package ?? null);
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
      if (error.message.includes('products_business_barcode_uidx')) {
        return NextResponse.json(
          { error: 'This barcode is already used by another product in your business', code: error.code },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'A product with this SKU already exists in this business.', code: error.code },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  const barcodeSyncError = await syncProductBarcodes(supabase, id, resolution.context.businessId, barcodes);
  if (barcodeSyncError) {
    return barcodeSyncError;
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

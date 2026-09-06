import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteSales, resolveActiveBusinessContext } from '@/lib/supabase/business-context';
import { CreateSalePayload } from '@/lib/supabase/types';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toNonEmptyTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      business_id,
      customer_name,
      customer_phone,
      reference_number,
      sale_date,
      payment_method,
      notes,
      total_amount,
      created_by,
      created_at,
      updated_at,
      sale_items(
        id,
        sale_id,
        product_id,
        quantity,
        unit_price,
        line_total,
        entry_mode,
        package_quantity,
        package_unit_snapshot,
        units_per_package_snapshot,
        package_unit_price,
        created_at,
        product:products(id, name, sku)
      )
    `)
    .eq('business_id', resolution.context.businessId)
    .order('sale_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  // NOTE: canWriteProducts should already permit cashier, per the sales RLS
  // policy (owner/admin/storekeeper/cashier). If canWriteProducts() does not
  // currently include 'cashier', that check needs updating separately from
  // this route -- flagging rather than silently trusting it matches.
  if (!canWriteSales(resolution.context.role)) {
    return NextResponse.json(
      { error: 'You are not authorized to record sales.' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as CreateSalePayload | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const idempotencyKey = toNonEmptyTrimmedString(body.idempotencyKey);
  if (!idempotencyKey || !uuidPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: 'A valid idempotency key is required.' }, { status: 400 });
  }

  const customerName = toNonEmptyTrimmedString(body.customerName ?? null);
  const customerPhone = toNonEmptyTrimmedString(body.customerPhone ?? null);
  const referenceNumber = toNonEmptyTrimmedString(body.referenceNumber ?? null);
  const paymentMethod = toNonEmptyTrimmedString(body.paymentMethod ?? null);
  const notes = toNonEmptyTrimmedString(body.notes ?? null);
  const saleDateInput = toNonEmptyTrimmedString(body.saleDate ?? null);
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (rawItems.length === 0) {
    return NextResponse.json({ error: 'At least one sale item is required.' }, { status: 400 });
  }

  const seenProductIds = new Set<string>();
  const rpcItems: Record<string, unknown>[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i] as any;
    const productId = toNonEmptyTrimmedString(item?.productId);

    if (!productId || !uuidPattern.test(productId)) {
      return NextResponse.json(
        { error: `Item #${i + 1}: Invalid or missing product ID.` },
        { status: 400 }
      );
    }

    if (seenProductIds.has(productId)) {
      return NextResponse.json(
        { error: `Item #${i + 1}: Duplicate product detected. Each product may only be added once per sale.` },
        { status: 400 }
      );
    }
    seenProductIds.add(productId);

    const entryMode = String(item?.entryMode ?? 'individual');

    if (entryMode === 'package') {
      const packageQuantity = Number(item?.packageQuantity);
      const packageUnitPrice = Number(item?.packageUnitPrice);

      if (!Number.isFinite(packageQuantity) || !Number.isInteger(packageQuantity) || packageQuantity <= 0) {
        return NextResponse.json(
          { error: `Item #${i + 1}: Package quantity must be a whole positive number.` },
          { status: 400 }
        );
      }

      if (!Number.isFinite(packageUnitPrice) || packageUnitPrice < 0) {
        return NextResponse.json(
          { error: `Item #${i + 1}: Package price cannot be negative.` },
          { status: 400 }
        );
      }

      rpcItems.push({
        product_id: productId,
        entry_mode: 'package',
        package_quantity: packageQuantity,
        package_unit_price: packageUnitPrice,
      });
    } else {
      const quantity = Number(item?.quantity);
      const unitPrice = Number(item?.unitPrice);

      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `Item #${i + 1}: Quantity must be a whole positive number.` },
          { status: 400 }
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          { error: `Item #${i + 1}: Unit price cannot be negative.` },
          { status: 400 }
        );
      }

      rpcItems.push({
        product_id: productId,
        entry_mode: 'individual',
        quantity,
        unit_price: unitPrice,
      });
    }
  }

  const activeBusinessId = resolution.context.businessId;
  const saleDate = saleDateInput ? new Date(saleDateInput).toISOString() : new Date().toISOString();

  console.error('[POST /api/sales] activeBusinessId:', activeBusinessId);
  const { data: saleId, error } = await supabase.rpc('create_sale_with_items', {
    p_business_id: activeBusinessId,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_reference_number: referenceNumber,
    p_payment_method: paymentMethod,
    p_items: rpcItems,
    p_idempotency_key: idempotencyKey,
    p_sale_date: saleDate,
    p_notes: notes,
  });

  if (error) {
    if (error.message?.toLowerCase().includes('insufficient stock')) {
      return NextResponse.json(
        { error: 'One or more items exceed available stock.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, saleId });
}
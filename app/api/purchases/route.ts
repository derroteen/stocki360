import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';
import { CreatePurchasePayload, CreatePurchaseItemPayload } from '@/lib/supabase/types';

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

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplierId');
  const productId = searchParams.get('productId');

  let query = supabase
    .from('purchases')
    .select(`
      id,
      business_id,
      supplier_id,
      reference_number,
      purchase_date,
      notes,
      total_amount,
      created_by,
      created_at,
      updated_at,
      supplier:suppliers(id, name),
      purchase_items(
        id,
        purchase_id,
        product_id,
        quantity,
        unit_cost,
        line_total,
        created_at,
        product:products(id, name, sku)
      )
    `)
    .eq('business_id', resolution.context.businessId)
    .order('purchase_date', { ascending: false });

  if (supplierId && uuidPattern.test(supplierId)) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let results = data ?? [];

  // If filtered by productId, filter client-side / relationally
  if (productId && uuidPattern.test(productId)) {
    results = results.filter((p: any) =>
      p.purchase_items?.some((item: any) => item.product_id === productId)
    );
  }

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json(
      { error: 'You are not authorized to record purchases.' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as CreatePurchasePayload | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const supplierId = toNonEmptyTrimmedString(body.supplierId);
  const referenceNumber = toNonEmptyTrimmedString(body.referenceNumber);
  const notes = toNonEmptyTrimmedString(body.notes);
  const purchaseDateInput = toNonEmptyTrimmedString(body.purchaseDate);
  const idempotencyKey = toNonEmptyTrimmedString(body.idempotencyKey);
  const rawItems = Array.isArray(body.items) ? (body.items as any[]) : [];

  if (!idempotencyKey || !uuidPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: 'A valid idempotency key is required.' }, { status: 400 });
  }

  // Parse items – each item may include entryMode: 'individual' or 'package'
  const parsedItems: CreatePurchaseItemPayload[] = [];
  const seenProductIds = new Set<string>();

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const productId = toNonEmptyTrimmedString(item?.productId);

    // Basic product-id validation
    if (!productId || !uuidPattern.test(productId)) {
      return NextResponse.json(
        { error: `Item #${i + 1}: Invalid or missing product ID.` },
        { status: 400 }
      );
    }

    if (seenProductIds.has(productId)) {
      return NextResponse.json(
        { error: `Item #${i + 1}: Duplicate product detected. Each product may only be added once per purchase.` },
        { status: 400 }
      );
    }
    seenProductIds.add(productId);

    const entryMode = String(item?.entryMode ?? 'individual').trim().toLowerCase();

    // ------- individual mode -------
    if (entryMode === 'individual') {
      const quantity = Number(item?.quantity);
      const unitCost = Number(item?.unitCost);

      if (
        !Number.isFinite(quantity) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          { error: `Item #${i + 1}: Quantity must be a whole positive number.` },
          { status: 400 }
        );
      }

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        return NextResponse.json(
          { error: `Item #${i + 1}: Unit cost cannot be negative.` },
          { status: 400 }
        );
      }

      parsedItems.push({
        productId,
        entryMode: 'individual' as const,
        quantity,
        unitCost,
      });
    }
    // ------- package mode -------
    else {
      // package mode: expect packageQuantity and packageUnitCost
      const packageQuantity = Number(item?.packageQuantity);
      const packageUnitCost = Number(item?.packageUnitCost);

      if (
        !Number.isFinite(packageQuantity) ||
        !Number.isInteger(packageQuantity) ||
        packageQuantity <= 0
      ) {
        return NextResponse.json(
          { error: `Item #${i + 1}: packageQuantity must be a whole positive number.` },
          { status: 400 }
        );
      }

      if (!Number.isFinite(packageUnitCost) || packageUnitCost < 0) {
        return NextResponse.json(
          { error: `Item #${i + 1}: packageUnitCost must be a non‑negative number.` },
          { status: 400 }
        );
      }

      parsedItems.push({
        productId,
        entryMode: 'package' as const,
        packageQuantity,
        packageUnitCost,
      });
    }
  }

  const activeBusinessId = resolution.context.businessId;

  if (supplierId) {
    if (!uuidPattern.test(supplierId)) {
      return NextResponse.json({ error: 'Invalid supplier ID.' }, { status: 400 });
    }
  }

  const purchaseDate = purchaseDateInput ? new Date(purchaseDateInput).toISOString() : new Date().toISOString();

  const { data: purchaseId, error } = await supabase.rpc('create_purchase_with_items', {
    p_business_id: activeBusinessId,
    p_supplier_id: supplierId || null,
    p_reference_number: referenceNumber || null,
    p_purchase_date: purchaseDate,
    p_notes: notes || null,
    p_items: parsedItems.map((item) => {
      const base = {
        product_id: item.productId,
        entry_mode: item.entryMode,
      };
      if (item.entryMode === 'individual') {
        return {
          ...base,
          quantity: item.quantity,
          unit_cost: item.unitCost,
        };
      }
      // package mode
      return {
        ...base,
        package_quantity: item.packageQuantity,
        package_unit_cost: item.packageUnitCost,
      };
    }),
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, purchaseId });
}

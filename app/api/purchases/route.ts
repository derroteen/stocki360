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
  const rawItems = Array.isArray(body.items) ? body.items : [];

  // Validate items
  if (rawItems.length === 0) {
    return NextResponse.json(
      { error: 'At least one purchase item is required.' },
      { status: 400 }
    );
  }

  const parsedItems: CreatePurchaseItemPayload[] = [];
  const seenProductIds = new Set<string>();

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const productId = toNonEmptyTrimmedString(item?.productId);
    const quantity = Number(item?.quantity);
    const unitCost = Number(item?.unitCost);

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

    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
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
      quantity,
      unitCost,
    });
  }

  const activeBusinessId = resolution.context.businessId;

  // Validate supplier if provided
  if (supplierId) {
    if (!uuidPattern.test(supplierId)) {
      return NextResponse.json({ error: 'Invalid supplier ID.' }, { status: 400 });
    }

    const { data: supplier, error: supplierErr } = await supabase
      .from('suppliers')
      .select('id, business_id, is_active')
      .eq('id', supplierId)
      .eq('business_id', activeBusinessId)
      .single();

    if (supplierErr || !supplier) {
      return NextResponse.json({ error: 'Supplier not found for active business.' }, { status: 404 });
    }
  }

  // Validate all products belong to active business and are active
  const productIds = parsedItems.map((item) => item.productId);
  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('id, business_id, is_active, name')
    .in('id', productIds)
    .eq('business_id', activeBusinessId);

  if (productsErr || !products || products.length !== productIds.length) {
    return NextResponse.json(
      { error: 'One or more products were not found in this business.' },
      { status: 400 }
    );
  }

  const archivedProduct = products.find((p) => !p.is_active);
  if (archivedProduct) {
    return NextResponse.json(
      { error: `Cannot receive stock for archived product "${archivedProduct.name}". Restore it first.` },
      { status: 400 }
    );
  }

  // Calculate totals server-side (do not trust client total_amount)
  const totalAmount = parsedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  const purchaseDate = purchaseDateInput ? new Date(purchaseDateInput).toISOString() : new Date().toISOString();

  // 1) Create the Purchase record
  const { data: purchaseData, error: purchaseErr } = await supabase
    .from('purchases')
    .insert({
      business_id: activeBusinessId,
      supplier_id: supplierId || null,
      reference_number: referenceNumber || null,
      purchase_date: purchaseDate,
      notes: notes || null,
      total_amount: Math.round(totalAmount * 100) / 100,
      created_by: resolution.context.userId,
    })
    .select('id')
    .single();

  if (purchaseErr || !purchaseData) {
    return NextResponse.json(
      { error: purchaseErr?.message ?? 'Failed to create purchase record.' },
      { status: 400 }
    );
  }

  const purchaseId = purchaseData.id;

  // 2) Create the Purchase Items
  const itemsToInsert = parsedItems.map((item) => ({
    purchase_id: purchaseId,
    product_id: item.productId,
    quantity: item.quantity,
    unit_cost: Math.round(item.unitCost * 100) / 100,
  }));

  const { error: itemsErr } = await supabase.from('purchase_items').insert(itemsToInsert);

  if (itemsErr) {
    return NextResponse.json(
      { error: `Failed to insert purchase items: ${itemsErr.message}` },
      { status: 400 }
    );
  }

  // 3) Record 'in' stock movements for each item using the authoritative stock movement RPC
  // The note references the purchase and reference number for clear inventory auditing.
  const notePrefix = referenceNumber
    ? `Purchase Ref: ${referenceNumber}`
    : `Purchase #${purchaseId.slice(0, 8)}`;

  for (const item of parsedItems) {
    const itemMovementKey = crypto.randomUUID();
    const { error: movementErr } = await supabase.rpc('record_stock_movement', {
      p_product_id: item.productId,
      p_movement_type: 'in',
      p_quantity: item.quantity,
      p_note: notePrefix,
      p_idempotency_key: itemMovementKey,
    });

    if (movementErr) {
      console.error(
        `Error recording stock movement for product ${item.productId} in purchase ${purchaseId}:`,
        movementErr
      );
      // We log but continue with remaining items so inventory increments wherever possible
    }
  }

  return NextResponse.json({ ok: true, purchaseId });
}

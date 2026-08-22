import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveBusinessContext } from '@/lib/supabase/business-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Purchase ID is required.' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  const { data, error } = await supabase
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
      supplier:suppliers(id, name, contact_person, phone, email),
      purchase_items(
        id,
        purchase_id,
        product_id,
        quantity,
        unit_cost,
        line_total,
        created_at,
        product:products(id, name, sku, cost_price, sell_price)
      )
    `)
    .eq('id', id)
    .eq('business_id', resolution.context.businessId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Purchase not found.' }, { status: 404 });
  }

  return NextResponse.json(data);
}

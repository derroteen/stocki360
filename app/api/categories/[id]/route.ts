import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteProducts, resolveActiveBusinessContext } from '@/lib/supabase/business-context';

type CategoryPayload = {
  name: string;
  description: string | null;
};

function toNonEmptyTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateCategoryInput(body: unknown): CategoryPayload {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const name = toNonEmptyTrimmedString(record.name);
  const description = toNonEmptyTrimmedString(record.description);

  if (!name) {
    throw new Error('Category name is required.');
  }

  return {
    name,
    description,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to update categories.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Special case: archive or restore action sets is_active without touching other fields.
  // The body must contain { action: 'archive' | 'restore' } to trigger this path.
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (record.action === 'archive' || record.action === 'restore') {
    const is_active = record.action === 'restore';

    const { error } = await supabase
      .from('categories')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', resolution.context.businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  // Standard edit: update name and description fields.
  let parsed: CategoryPayload;
  try {
    parsed = validateCategoryInput(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const payload = {
    ...parsed,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .eq('business_id', resolution.context.businessId);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A category with this name already exists in this business.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

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

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveActiveBusinessContext(supabase);

  if (!resolution.context) {
    const status = resolution.needsSelection ? 409 : 403;
    return NextResponse.json({ error: 'Active business context is required.' }, { status });
  }

  if (!canWriteProducts(resolution.context.role)) {
    return NextResponse.json({ error: 'You are not allowed to create categories.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  let parsed: CategoryPayload;
  try {
    parsed = validateCategoryInput(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const payload = {
    ...parsed,
    business_id: resolution.context.businessId,
  };

  const { error } = await supabase.from('categories').insert([payload]);

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

-- Captures has_business_role() and record_stock_movement(), both created
-- directly in the Supabase SQL editor and missing from version control.
-- Retrieved via pg_get_functiondef() on 2026-08-21.
--
-- NOTE: record_stock_movement() is NOT security definer as deployed.
-- This may block the 'cashier' role from completing sales, since
-- create_sale_with_items() authorizes cashiers to record sales, but the
-- resulting stock_movements insert runs as the calling user and is
-- subject to RLS, which restricts stock_movements INSERT to
-- owner/admin/storekeeper. Verify with a cashier-role test account
-- before relying on this migration as the final, correct version.

begin;

create or replace function public.has_business_role(p_business_id uuid, p_roles text[])
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.is_active = true
      and bm.role = any (p_roles)
  );
$function$;

create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_note text default null::text,
  p_idempotency_key uuid default null::uuid
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_business_id uuid;
  v_is_active boolean;
  v_last_adjustment_at timestamptz;
  v_current_stock bigint := 0;
begin
  if p_idempotency_key is null then
    raise exception 'Idempotency key is required';
  end if;

  if exists (
    select 1
    from public.stock_movements sm
    where sm.idempotency_key = p_idempotency_key
  ) then
    return;
  end if;

  if p_movement_type not in ('in', 'out', 'adjustment') then
    raise exception 'Invalid movement type';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select p.business_id, p.is_active
  into v_business_id, v_is_active
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found for active business.';
  end if;

  if not v_is_active then
    raise exception 'Archived products cannot receive new stock movements.';
  end if;

  if p_movement_type = 'out' then
    select
      max(
        case
          when sm.movement_type = 'adjustment' then sm.created_at
          else null::timestamp with time zone
        end
      )
    into v_last_adjustment_at
    from public.stock_movements sm
    where sm.product_id = p_product_id;

    select
      coalesce(
        sum(
          case
            when sm.movement_type = 'in' then sm.quantity
            when sm.movement_type = 'out' then -sm.quantity
            when sm.movement_type = 'adjustment' then sm.quantity
            else 0
          end
        ),
        0
      )
    into v_current_stock
    from public.stock_movements sm
    where sm.product_id = p_product_id
      and (
        v_last_adjustment_at is null
        or sm.created_at >= v_last_adjustment_at
      );

    if p_quantity > v_current_stock then
      raise exception 'Insufficient stock';
    end if;
  end if;

  insert into public.stock_movements (product_id, movement_type, quantity, note, idempotency_key)
  values (p_product_id, p_movement_type, p_quantity, p_note, p_idempotency_key)
  on conflict (idempotency_key)
  where idempotency_key is not null
  do nothing;
end;
$function$;

commit;
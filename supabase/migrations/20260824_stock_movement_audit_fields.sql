begin;

alter table public.stock_movements
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_by_email text;

-- Re-declaring record_stock_movement to also capture who performed the movement.
-- IMPORTANT: CREATE OR REPLACE resets SECURITY DEFINER back to the default
-- (INVOKER) unless explicitly restated -- so it must be included here again,
-- even though it was already set via ALTER FUNCTION earlier.
create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_note text default null::text,
  p_idempotency_key uuid default null::uuid
)
returns void
language plpgsql
security definer
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

  insert into public.stock_movements (
    product_id, movement_type, quantity, note, idempotency_key,
    created_by, created_by_email
  )
  values (
    p_product_id, p_movement_type, p_quantity, p_note, p_idempotency_key,
    auth.uid(), auth.jwt() ->> 'email'
  )
  on conflict (idempotency_key)
  where idempotency_key is not null
  do nothing;
end;
$function$;

commit;
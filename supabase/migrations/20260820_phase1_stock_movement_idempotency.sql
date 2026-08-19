-- Phase 1 stock movement idempotency capture
-- Mirrors already-deployed DB behavior in an idempotent, replay-safe migration.

begin;

-- Store a client-generated key so one logical submission can be retried safely.
alter table public.stock_movements
  add column if not exists idempotency_key uuid;

-- Partial uniqueness keeps legacy null rows valid while enforcing dedupe on keyed writes.
create unique index if not exists stock_movements_idempotency_key_uidx
  on public.stock_movements (idempotency_key)
  where idempotency_key is not null;

-- Remove the legacy 4-argument signature so callers use the idempotent contract.
drop function if exists public.record_stock_movement(
  uuid,
  text,
  integer,
  text
);

create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_note text default null,
  p_idempotency_key uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business_id uuid;
  v_is_active boolean;
  v_last_adjustment_at timestamptz;
  v_current_stock bigint := 0;
begin
  -- Preserve deployed behavior: idempotency key is required for at-most-once submission semantics.
  if p_idempotency_key is null then
    raise exception 'Idempotency key is required';
  end if;

  -- Retry of the same logical submission should be a no-op.
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

  -- Lock the product row so concurrent stock writes serialize per product.
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
    -- Use the same adjustment-reset stock semantics as product_stock_levels.
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

  -- ON CONFLICT keeps replayed submissions as no-ops under concurrent/network retry conditions.
  insert into public.stock_movements (product_id, movement_type, quantity, note, idempotency_key)
  values (p_product_id, p_movement_type, p_quantity, p_note, p_idempotency_key)
  on conflict (idempotency_key)
  where idempotency_key is not null
  do nothing;
end;
$$;

-- Intentionally no ACL rewrite here: migration preserves verified deployed privileges.

commit;

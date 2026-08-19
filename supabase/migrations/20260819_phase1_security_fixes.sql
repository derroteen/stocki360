-- Phase 1 security fixes (final)
-- Handles product_stock_levels as a VIEW with security invoker and
-- preserves existing inventory calculation logic.
-- Safe/idempotent where practical. Do not auto-apply from this workspace.

begin;

-- security_invoker on views requires PostgreSQL 15+
do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'product_stock_levels security fix requires PostgreSQL 15+ (security_invoker views)';
  end if;
end
$$;

-- 1) product_stock_levels is a VIEW; preserve exact stock logic and output shape.
create or replace view public.product_stock_levels
with (security_invoker = true)
as
with ordered as (
  select
    sm.product_id,
    sm.movement_type,
    sm.quantity,
    sm.created_at,
    max(
      case
        when sm.movement_type = 'adjustment'::text then sm.created_at
        else null::timestamp with time zone
      end
    ) over (partition by sm.product_id) as last_adjustment_at
  from stock_movements sm
),
aggregated as (
  select
    ordered.product_id,
    sum(
      case
        when ordered.movement_type = 'in'::text then ordered.quantity
        when ordered.movement_type = 'out'::text then -ordered.quantity
        when ordered.movement_type = 'adjustment'::text then ordered.quantity
        else 0
      end
    ) as current_stock
  from ordered
  where ordered.last_adjustment_at is null
     or ordered.created_at >= ordered.last_adjustment_at
  group by ordered.product_id
)
select
  p.id,
  p.id as product_id,
  p.business_id,
  p.sku,
  p.name,
  p.cost_price,
  p.sell_price,
  p.reorder_level,
  coalesce(a.current_stock, 0::bigint) as current_stock,
  coalesce(a.current_stock, 0::bigint) <= p.reorder_level as is_low_stock
from products p
left join aggregated a on a.product_id = p.id;

-- 2) Underlying table protections for view and API access
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

create or replace function public.is_active_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.is_active = true
  );
$$;

create or replace function public.has_business_role(
  p_business_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.is_active = true
      and bm.role = any (p_roles)
  );
$$;

-- products policies
-- SELECT: active business members
-- INSERT/UPDATE/DELETE: owner/admin/storekeeper
drop policy if exists products_select_active_member on public.products;
create policy products_select_active_member
  on public.products
  for select
  to authenticated
  using (public.is_active_member(business_id));

drop policy if exists products_insert_ops_roles on public.products;
create policy products_insert_ops_roles
  on public.products
  for insert
  to authenticated
  with check (
    public.has_business_role(business_id, array['owner', 'admin', 'storekeeper'])
  );

drop policy if exists products_update_ops_roles on public.products;
create policy products_update_ops_roles
  on public.products
  for update
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin', 'storekeeper'])
  )
  with check (
    public.has_business_role(business_id, array['owner', 'admin', 'storekeeper'])
  );

drop policy if exists products_delete_ops_roles on public.products;
create policy products_delete_ops_roles
  on public.products
  for delete
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin', 'storekeeper'])
  );

-- stock_movements policies
-- SELECT: active members of owning business
-- INSERT: owner/admin/storekeeper
-- UPDATE/DELETE: denied for authenticated users (append-only ledger)
drop policy if exists stock_movements_select_member on public.stock_movements;
create policy stock_movements_select_member
  on public.stock_movements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = stock_movements.product_id
        and public.is_active_member(p.business_id)
    )
  );

drop policy if exists stock_movements_insert_ops_roles on public.stock_movements;
create policy stock_movements_insert_ops_roles
  on public.stock_movements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.products p
      where p.id = stock_movements.product_id
        and public.has_business_role(p.business_id, array['owner', 'admin', 'storekeeper'])
    )
  );

-- remove permissive update/delete policies if present
drop policy if exists stock_movements_update_ops_roles on public.stock_movements;
drop policy if exists stock_movements_delete_ops_roles on public.stock_movements;

-- explicit deny policies for authenticated users
drop policy if exists stock_movements_update_block_authenticated on public.stock_movements;
create policy stock_movements_update_block_authenticated
  on public.stock_movements
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists stock_movements_delete_block_authenticated on public.stock_movements;
create policy stock_movements_delete_block_authenticated
  on public.stock_movements
  for delete
  to authenticated
  using (false);

-- 3) Safe first-business bootstrap
-- creates a new business + creator owner membership atomically.
create or replace function public.create_business_with_owner(p_name text)
returns table (business_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_business_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Business name is required';
  end if;

  insert into public.businesses (name, owner_id)
  values (btrim(p_name), v_user_id)
  returning id into v_business_id;

  insert into public.business_memberships (business_id, user_id, role, is_active)
  values (v_business_id, v_user_id, 'owner', true)
  on conflict (business_id, user_id)
  do update set role = 'owner', is_active = true;

  return query select v_business_id;
end;
$$;

revoke all on function public.create_business_with_owner(text) from public;
grant execute on function public.create_business_with_owner(text) to authenticated;

commit;

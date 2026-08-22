-- Phase 2: Product Categories and Suppliers

begin;

-- 1) Create categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create index if not exists idx_categories_business on public.categories(business_id);

-- 2) Create suppliers table
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_business on public.suppliers(business_id);

-- 3) Enable RLS
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;

-- 4) Categories policies
-- SELECT: active members can read categories for their business
drop policy if exists categories_select_active_member on public.categories;
create policy categories_select_active_member
  on public.categories
  for select
  to authenticated
  using (public.is_active_member(business_id));

-- INSERT/UPDATE/DELETE: ops roles can manage categories
drop policy if exists categories_insert_ops_roles on public.categories;
create policy categories_insert_ops_roles
  on public.categories
  for insert
  to authenticated
  with check (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']));

drop policy if exists categories_update_ops_roles on public.categories;
create policy categories_update_ops_roles
  on public.categories
  for update
  to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']))
  with check (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']));

drop policy if exists categories_delete_ops_roles on public.categories;
create policy categories_delete_ops_roles
  on public.categories
  for delete
  to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']));

-- 5) Suppliers policies
-- SELECT: active members can read suppliers for their business
drop policy if exists suppliers_select_active_member on public.suppliers;
create policy suppliers_select_active_member
  on public.suppliers
  for select
  to authenticated
  using (public.is_active_member(business_id));

-- INSERT/UPDATE/DELETE: ops roles can manage suppliers
drop policy if exists suppliers_insert_ops_roles on public.suppliers;
create policy suppliers_insert_ops_roles
  on public.suppliers
  for insert
  to authenticated
  with check (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']));

drop policy if exists suppliers_update_ops_roles on public.suppliers;
create policy suppliers_update_ops_roles
  on public.suppliers
  for update
  to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']))
  with check (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']));

drop policy if exists suppliers_delete_ops_roles on public.suppliers;
create policy suppliers_delete_ops_roles
  on public.suppliers
  for delete
  to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']));

-- 6) Update products table
alter table public.products
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_supplier on public.products(supplier_id);

-- 7) Recreate product_stock_levels view with new columns
-- We need to drop it first because we are changing the columns (adding new ones)
drop view if exists public.product_stock_levels;

create view public.product_stock_levels
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
  p.category_id,
  p.supplier_id,
  coalesce(a.current_stock, 0::bigint) as current_stock,
  coalesce(a.current_stock, 0::bigint) <= p.reorder_level as is_low_stock
from products p
left join aggregated a on a.product_id = p.id;

commit;

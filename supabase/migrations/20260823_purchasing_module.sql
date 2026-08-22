-- Phase 2c: Purchasing / Stock Receiving Module
--
-- This migration creates the `purchases` and `purchase_items` tables,
-- enforces multi-tenant RLS, and sets up indexes for fast business-scoped
-- filtering and reporting.

begin;

-- 1) Create purchases table
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid null references public.suppliers(id) on delete set null,
  reference_number text null,
  purchase_date timestamptz not null default now(),
  notes text null,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_purchases_business on public.purchases(business_id);
create index if not exists idx_purchases_supplier on public.purchases(supplier_id);
create index if not exists idx_purchases_date on public.purchases(business_id, purchase_date desc);

-- 2) Create purchase_items table
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_cost) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_items_purchase on public.purchase_items(purchase_id);
create index if not exists idx_purchase_items_product on public.purchase_items(product_id);

-- 3) Enable Row Level Security
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;

-- 4) Purchases RLS Policies
-- SELECT: active members of the business can view purchases
drop policy if exists purchases_select_active_member on public.purchases;
create policy purchases_select_active_member
  on public.purchases
  for select
  to authenticated
  using (public.is_active_member(business_id));

-- INSERT: operations roles (owner, admin, storekeeper) can create purchases
drop policy if exists purchases_insert_ops_roles on public.purchases;
create policy purchases_insert_ops_roles
  on public.purchases
  for insert
  to authenticated
  with check (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']));

-- UPDATE: operations roles can update purchases
drop policy if exists purchases_update_ops_roles on public.purchases;
create policy purchases_update_ops_roles
  on public.purchases
  for update
  to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']))
  with check (public.has_business_role(business_id, array['owner', 'admin', 'storekeeper']));

-- 5) Purchase Items RLS Policies
-- SELECT: active members can view purchase items for purchases belonging to their business
drop policy if exists purchase_items_select_active_member on public.purchase_items;
create policy purchase_items_select_active_member
  on public.purchase_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_items.purchase_id
        and public.is_active_member(p.business_id)
    )
  );

-- INSERT: operations roles can insert purchase items
drop policy if exists purchase_items_insert_ops_roles on public.purchase_items;
create policy purchase_items_insert_ops_roles
  on public.purchase_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_items.purchase_id
        and public.has_business_role(p.business_id, array['owner', 'admin', 'storekeeper'])
    )
  );

commit;

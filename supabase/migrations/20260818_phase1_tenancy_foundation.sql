-- Phase 1: Tenancy, memberships, product safety, and RLS foundation
-- Safe/idempotent migration intended for existing deployments.

begin;

-- 1) Membership table for multi-business user access
create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'storekeeper', 'cashier')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists idx_business_memberships_user_active
  on public.business_memberships(user_id, is_active);

create index if not exists idx_business_memberships_business_active
  on public.business_memberships(business_id, is_active);

-- 2) Product soft-archive support
alter table public.products
  add column if not exists is_active boolean not null default true;

-- 3) Row Level Security
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

-- 4) Policy helpers
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

-- 5) Businesses policies
-- Members can read businesses they belong to.
drop policy if exists businesses_select_active_member on public.businesses;
create policy businesses_select_active_member
  on public.businesses
  for select
  to authenticated
  using (public.is_active_member(id));

-- 6) Membership policies
-- Users can read their own memberships, and owner/admin can read memberships within their business.
drop policy if exists memberships_select_self_or_admin on public.business_memberships;
create policy memberships_select_self_or_admin
  on public.business_memberships
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_business_role(business_id, array['owner', 'admin'])
  );

-- Owner/admin can create memberships in their business.
drop policy if exists memberships_insert_owner_admin on public.business_memberships;
create policy memberships_insert_owner_admin
  on public.business_memberships
  for insert
  to authenticated
  with check (
    public.has_business_role(business_id, array['owner', 'admin'])
  );

-- Owner/admin can update memberships in their business.
drop policy if exists memberships_update_owner_admin on public.business_memberships;
create policy memberships_update_owner_admin
  on public.business_memberships
  for update
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin'])
  )
  with check (
    public.has_business_role(business_id, array['owner', 'admin'])
  );

-- Owner/admin can delete memberships in their business.
drop policy if exists memberships_delete_owner_admin on public.business_memberships;
create policy memberships_delete_owner_admin
  on public.business_memberships
  for delete
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin'])
  );

-- 7) Products policies
-- All active members can read products for their business.
drop policy if exists products_select_active_member on public.products;
create policy products_select_active_member
  on public.products
  for select
  to authenticated
  using (public.is_active_member(business_id));

-- Owner/admin/storekeeper can insert products for their business.
drop policy if exists products_insert_ops_roles on public.products;
create policy products_insert_ops_roles
  on public.products
  for insert
  to authenticated
  with check (
    public.has_business_role(business_id, array['owner', 'admin', 'storekeeper'])
  );

-- Owner/admin/storekeeper can update products for their business.
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

-- Owner/admin/storekeeper can delete products for their business.
-- Application should prefer archive (is_active = false) instead of hard delete.
drop policy if exists products_delete_ops_roles on public.products;
create policy products_delete_ops_roles
  on public.products
  for delete
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin', 'storekeeper'])
  );

-- 8) Stock movement policies (scoped through product ownership)
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

drop policy if exists stock_movements_update_ops_roles on public.stock_movements;
create policy stock_movements_update_ops_roles
  on public.stock_movements
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = stock_movements.product_id
        and public.has_business_role(p.business_id, array['owner', 'admin', 'storekeeper'])
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = stock_movements.product_id
        and public.has_business_role(p.business_id, array['owner', 'admin', 'storekeeper'])
    )
  );

drop policy if exists stock_movements_delete_ops_roles on public.stock_movements;
create policy stock_movements_delete_ops_roles
  on public.stock_movements
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = stock_movements.product_id
        and public.has_business_role(p.business_id, array['owner', 'admin', 'storekeeper'])
    )
  );

commit;

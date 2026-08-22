-- Phase 2b: Add is_active (soft-archive) to categories and suppliers
--
-- This migration adds an is_active boolean to both tables so that records
-- can be archived rather than permanently deleted, preserving historical
-- product references.

begin;

-- Add is_active to categories. Existing rows are active by default.
alter table public.categories
  add column if not exists is_active boolean not null default true;

-- Add is_active to suppliers. Existing rows are active by default.
alter table public.suppliers
  add column if not exists is_active boolean not null default true;

-- Index to make filtering active/archived records fast.
create index if not exists idx_categories_business_active
  on public.categories(business_id, is_active);

create index if not exists idx_suppliers_business_active
  on public.suppliers(business_id, is_active);

commit;

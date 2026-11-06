-- Security hardening applied MANUALLY in the Supabase SQL Editor (Nov 2026).
-- This file is a RECORD of what is already live. Every statement is idempotent
-- (drop policy if exists / revoke / grant), so re-running it is harmless.
-- Apply order on a fresh database: the older migrations first, then this file,
-- then 2026110x_stock_ledger_phase1.sql.

-- ---------------------------------------------------------------------------
-- Step A: stock_movements becomes append-only through the API, and the three
-- stock functions are no longer callable by visitors who are not logged in.
-- ---------------------------------------------------------------------------
begin;

drop policy if exists stock_movements_update_ops_roles on public.stock_movements;
drop policy if exists stock_movements_delete_ops_roles on public.stock_movements;
drop policy if exists stock_movements_update_block_authenticated on public.stock_movements;
drop policy if exists stock_movements_delete_block_authenticated on public.stock_movements;
drop policy if exists stock_movements_insert_ops_roles on public.stock_movements;
drop policy if exists stock_movements_insert_own on public.stock_movements;

revoke insert, update, delete, truncate, references, trigger
  on public.stock_movements from anon, authenticated;
revoke select on public.stock_movements from anon;

revoke execute on function public.record_stock_movement(uuid, text, integer, text, uuid)
  from public, anon;
revoke execute on function public.create_sale_with_items(uuid, text, text, text, text, jsonb, uuid, timestamptz, text)
  from public, anon;
revoke execute on function public.create_purchase_with_items(uuid, uuid, text, jsonb, uuid, timestamptz, text)
  from public, anon;

grant execute on function public.record_stock_movement(uuid, text, integer, text, uuid) to authenticated;
grant execute on function public.create_sale_with_items(uuid, text, text, text, text, jsonb, uuid, timestamptz, text) to authenticated;
grant execute on function public.create_purchase_with_items(uuid, uuid, text, jsonb, uuid, timestamptz, text) to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Step A3: sales, sale items, purchase items, memberships are append-only or
-- function-only; no hard deletes of products or businesses; anon has no
-- direct table access. (purchases insert/update and purchase_items insert
-- were removed later by the stock ledger Phase 1 migration.)
-- ---------------------------------------------------------------------------
begin;

drop policy if exists sales_insert_ops_roles on public.sales;
drop policy if exists sales_update_ops_roles on public.sales;
drop policy if exists sales_delete_owner_admin on public.sales;
drop policy if exists sale_items_insert_ops_roles on public.sale_items;
drop policy if exists sale_items_update_ops_roles on public.sale_items;
drop policy if exists sale_items_delete_owner_admin on public.sale_items;
revoke insert, update, delete, truncate, references, trigger
  on table public.sales, public.sale_items from authenticated;

drop policy if exists purchase_items_update_ops_roles on public.purchase_items;
drop policy if exists purchase_items_delete_owner_admin on public.purchase_items;
drop policy if exists purchases_delete_owner_admin on public.purchases;
revoke update, delete, truncate, references, trigger on table public.purchase_items from authenticated;
revoke delete, truncate, references, trigger on table public.purchases from authenticated;

drop policy if exists memberships_insert_owner_admin on public.business_memberships;
drop policy if exists memberships_update_owner_admin on public.business_memberships;
drop policy if exists memberships_delete_owner_admin on public.business_memberships;
revoke insert, update, delete, truncate, references, trigger
  on table public.business_memberships from authenticated;

drop policy if exists products_delete_ops_roles on public.products;
drop policy if exists products_delete_own on public.products;
drop policy if exists businesses_delete_own on public.businesses;
revoke delete, truncate, references, trigger
  on table public.products, public.businesses from authenticated;

revoke all on all tables in schema public from anon;

commit;

-- ---------------------------------------------------------------------------
-- Step A2 (OPTIONAL): visitors who are not logged in should not be able to run
-- the business and invitation functions. Apply ONLY if this query still shows
-- anon_can_run = true for them:
--
--   select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_run
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname in
--     ('accept_business_invitation','create_business_invitation',
--      'create_business_with_owner','revoke_business_invitation');
--
-- Uncomment and run if needed:
--
-- begin;
-- revoke execute on function public.accept_business_invitation(uuid) from public, anon;
-- revoke execute on function public.create_business_invitation(uuid, text, text) from public, anon;
-- revoke execute on function public.create_business_with_owner(text) from public, anon;
-- revoke execute on function public.revoke_business_invitation(uuid) from public, anon;
-- grant execute on function public.accept_business_invitation(uuid) to authenticated;
-- grant execute on function public.create_business_invitation(uuid, text, text) to authenticated;
-- grant execute on function public.create_business_with_owner(text) to authenticated;
-- grant execute on function public.revoke_business_invitation(uuid) to authenticated;
-- commit;

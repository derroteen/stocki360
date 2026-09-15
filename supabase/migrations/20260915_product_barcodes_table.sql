begin;

create table if not exists public.product_barcodes (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  barcode     text not null,
  entry_mode  text not null default 'individual'
                check (entry_mode in ('individual', 'package')),
  label       text,
  created_at  timestamptz not null default now(),
  constraint product_barcodes_barcode_not_blank check (btrim(barcode) <> '')
);

-- One barcode can only mean one thing within a business.
create unique index if not exists product_barcodes_business_barcode_uidx
  on public.product_barcodes (business_id, barcode);

create index if not exists product_barcodes_product_idx
  on public.product_barcodes (product_id);

alter table public.product_barcodes enable row level security;

drop policy if exists product_barcodes_select_member on public.product_barcodes;
create policy product_barcodes_select_member
  on public.product_barcodes for select to authenticated
  using (public.is_active_member(business_id));

drop policy if exists product_barcodes_insert_ops on public.product_barcodes;
create policy product_barcodes_insert_ops
  on public.product_barcodes for insert to authenticated
  with check (public.has_business_role(business_id, array['owner','admin','storekeeper']));

drop policy if exists product_barcodes_update_ops on public.product_barcodes;
create policy product_barcodes_update_ops
  on public.product_barcodes for update to authenticated
  using (public.has_business_role(business_id, array['owner','admin','storekeeper']))
  with check (public.has_business_role(business_id, array['owner','admin','storekeeper']));

drop policy if exists product_barcodes_delete_ops on public.product_barcodes;
create policy product_barcodes_delete_ops
  on public.product_barcodes for delete to authenticated
  using (public.has_business_role(business_id, array['owner','admin','storekeeper']));

-- Carry across any barcodes already entered on products.barcode.
insert into public.product_barcodes (business_id, product_id, barcode, entry_mode, label)
select p.business_id, p.id, btrim(p.barcode), 'individual', 'Unit'
from public.products p
where p.barcode is not null and btrim(p.barcode) <> ''
on conflict (business_id, barcode) do nothing;

commit;
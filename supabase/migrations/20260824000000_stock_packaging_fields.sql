-- Migration to add stock packaging and conversion fields to products table

begin;

alter table public.products
  add column if not exists stock_unit text not null default 'unit',
  add column if not exists package_unit text,
  add column if not exists units_per_package integer;

-- Ensure that if package_unit is provided, units_per_package is also provided and greater than 0
alter table public.products
  add constraint products_packaging_check 
  check (
    (package_unit is null and units_per_package is null) or 
    (package_unit is not null and units_per_package is not null and units_per_package > 0)
  );

commit;

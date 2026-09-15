begin;

alter table public.products
  add column if not exists package_cost_price numeric(12,2),
  add column if not exists package_sell_price numeric(12,2);

alter table public.products
  add constraint products_package_prices_non_negative
  check (
    (package_cost_price is null or package_cost_price >= 0)
    and (package_sell_price is null or package_sell_price >= 0)
  );

comment on column public.products.cost_price is
  'Cost per single stock_unit (e.g. per 1kg), not per package.';
comment on column public.products.sell_price is
  'Selling price per single stock_unit (e.g. per 1kg), not per package.';
comment on column public.products.package_cost_price is
  'Cost of one full package (e.g. one 20kg bag). Optional.';
comment on column public.products.package_sell_price is
  'Selling price of one full package. Usually less than sell_price x units_per_package due to bulk discount. Optional.';

-- product_stock_levels is queried with select('*') throughout the app, so
-- the new columns must be exposed here too. CREATE OR REPLACE VIEW only
-- permits appending at the end, so this reproduces the column order from
-- 20260825_product_barcode.sql (which ends in p.barcode) and appends the
-- two package price columns last.
create or replace view public.product_stock_levels
with (security_invoker = true) as
 WITH ordered AS (
         SELECT sm.product_id,
            sm.movement_type,
            sm.quantity,
            sm.created_at,
            max(
                CASE
                    WHEN sm.movement_type = 'adjustment'::text THEN sm.created_at
                    ELSE NULL::timestamp with time zone
                END) OVER (PARTITION BY sm.product_id) AS last_adjustment_at
           FROM stock_movements sm
        ), aggregated AS (
         SELECT ordered.product_id,
            sum(
                CASE
                    WHEN ordered.movement_type = 'in'::text THEN ordered.quantity
                    WHEN ordered.movement_type = 'out'::text THEN - ordered.quantity
                    WHEN ordered.movement_type = 'adjustment'::text THEN ordered.quantity
                    ELSE 0
                END) AS current_stock
           FROM ordered
          WHERE ordered.last_adjustment_at IS NULL OR ordered.created_at >= ordered.last_adjustment_at
          GROUP BY ordered.product_id
        )
 SELECT p.id,
    p.id AS product_id,
    p.business_id,
    p.sku,
    p.name,
    p.cost_price,
    p.sell_price,
    p.reorder_level,
    p.category_id,
    p.supplier_id,
    COALESCE(a.current_stock, 0::bigint) AS current_stock,
    COALESCE(a.current_stock, 0::bigint) <= p.reorder_level AS is_low_stock,
    p.stock_unit,
    p.package_unit,
    p.units_per_package,
    p.barcode,
    p.package_cost_price,
    p.package_sell_price
   FROM products p
     LEFT JOIN aggregated a ON a.product_id = p.id;

grant select on public.product_stock_levels to authenticated;

commit;
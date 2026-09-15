begin;

-- Ensure the column exists on the table first (no-op if the earlier
-- barcode migration already ran).
alter table public.products
  add column if not exists barcode text;

create unique index if not exists products_business_barcode_uidx
  on public.products (business_id, barcode)
  where barcode is not null and barcode <> '';

-- Append barcode to the view. This is the live definition as of
-- pg_get_viewdef(), with p.barcode added as the final column.
-- CREATE OR REPLACE VIEW only permits appending at the end, so the
-- existing column order is preserved exactly.
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
    p.barcode
   FROM products p
     LEFT JOIN aggregated a ON a.product_id = p.id;

grant select on public.product_stock_levels to authenticated;

commit;
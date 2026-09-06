-- Captures the create_sale_with_items() function that was created directly
-- in the Supabase SQL editor and was missing from version control.
-- Retrieved from the live database via pg_get_functiondef() on 2026-08-21.
--
-- Depends on: public.record_stock_movement(), public.has_business_role(),
-- and the products.package_unit / products.units_per_package columns.
-- If this migration is ever run against a fresh database, those must
-- already exist first.

begin;

create or replace function public.create_sale_with_items(
  p_business_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_reference_number text,
  p_payment_method text,
  p_items jsonb,
  p_idempotency_key uuid,
  p_sale_date timestamp with time zone default now(),
  p_notes text default null::text
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_existing_sale_id uuid;
  v_sale_id uuid;
  v_total_amount numeric(12,2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_entry_mode text;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_package_quantity integer;
  v_package_unit_price numeric(12,2);
  v_product_package_unit text;
  v_product_units_per_package integer;
  v_item_count integer := 0;
  v_distinct_product_count integer;
  v_movement_note text;
  v_movement_key uuid;
begin
  if p_idempotency_key is null then
    raise exception 'Idempotency key is required';
  end if;

  select id into v_existing_sale_id
  from public.sales
  where idempotency_key = p_idempotency_key;

  if found then
    return v_existing_sale_id;
  end if;

  if not public.has_business_role(p_business_id, array['owner', 'admin', 'storekeeper', 'cashier']) then
    raise exception 'You are not authorized to record sales for this business.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one sale item is required.';
  end if;

  v_item_count := jsonb_array_length(p_items);

  select count(distinct (elem->>'product_id'))
  into v_distinct_product_count
  from jsonb_array_elements(p_items) elem;

  if v_distinct_product_count <> v_item_count then
    raise exception 'Duplicate product detected. Each product may only be added once per sale.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;

    if not exists (
      select 1 from public.products p
      where p.id = v_product_id
        and p.business_id = p_business_id
        and p.is_active
      for update
    ) then
      raise exception 'Product % was not found or is archived in this business.', v_product_id;
    end if;
  end loop;

  insert into public.sales (
    business_id, customer_name, customer_phone, reference_number,
    sale_date, payment_method, notes, total_amount, created_by, idempotency_key
  )
  values (
    p_business_id, p_customer_name, p_customer_phone, p_reference_number,
    coalesce(p_sale_date, now()), p_payment_method, p_notes,
    0, auth.uid(), p_idempotency_key
  )
  returning id into v_sale_id;

  v_movement_note := coalesce('Sale Ref: ' || p_reference_number, 'Sale #' || left(v_sale_id::text, 8));

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_entry_mode := coalesce(v_item->>'entry_mode', 'individual');

    if v_entry_mode not in ('individual', 'package') then
      raise exception 'Invalid entry_mode for product %.', v_product_id;
    end if;

    if v_entry_mode = 'package' then
      v_package_quantity := (v_item->>'package_quantity')::integer;
      v_package_unit_price := (v_item->>'package_unit_price')::numeric;

      if v_package_quantity is null or v_package_quantity <= 0 then
        raise exception 'Package quantity must be a whole positive number for product %.', v_product_id;
      end if;

      if v_package_unit_price is null or v_package_unit_price < 0 then
        raise exception 'Package price cannot be negative for product %.', v_product_id;
      end if;

      select p.package_unit, p.units_per_package
      into v_product_package_unit, v_product_units_per_package
      from public.products p
      where p.id = v_product_id;

      if v_product_package_unit is null or v_product_units_per_package is null then
        raise exception 'Product % does not have bulk packaging configured.', v_product_id;
      end if;

      v_quantity := v_package_quantity * v_product_units_per_package;
      v_unit_price := round(v_package_unit_price / v_product_units_per_package, 2);

      insert into public.sale_items (
        sale_id, product_id, quantity, unit_price,
        entry_mode, package_quantity, package_unit_snapshot,
        units_per_package_snapshot, package_unit_price
      )
      values (
        v_sale_id, v_product_id, v_quantity, v_unit_price,
        'package', v_package_quantity, v_product_package_unit,
        v_product_units_per_package, round(v_package_unit_price, 2)
      );
    else
      v_quantity := (v_item->>'quantity')::integer;
      v_unit_price := (v_item->>'unit_price')::numeric;

      if v_quantity is null or v_quantity <= 0 then
        raise exception 'Item quantity must be a whole positive number for product %.', v_product_id;
      end if;

      if v_unit_price is null or v_unit_price < 0 then
        raise exception 'Item unit price cannot be negative for product %.', v_product_id;
      end if;

      insert into public.sale_items (sale_id, product_id, quantity, unit_price, entry_mode)
      values (v_sale_id, v_product_id, v_quantity, round(v_unit_price, 2), 'individual');
    end if;

    v_total_amount := v_total_amount + (v_quantity * v_unit_price);

    v_movement_key := md5(p_idempotency_key::text || ':' || v_product_id::text)::uuid;

    -- 'out' movement type: record_stock_movement already enforces
    -- insufficient-stock protection for this type -- if any line would
    -- take stock negative, this raises and the whole sale rolls back,
    -- including any earlier lines already inserted in this same call.
    perform public.record_stock_movement(
      p_product_id := v_product_id,
      p_movement_type := 'out',
      p_quantity := v_quantity,
      p_note := v_movement_note,
      p_idempotency_key := v_movement_key
    );
  end loop;

  update public.sales
  set total_amount = round(v_total_amount, 2)
  where id = v_sale_id;

  return v_sale_id;
end;
$function$;

grant execute on function public.create_sale_with_items(
  uuid, text, text, text, text, jsonb, uuid, timestamptz, text
) to authenticated;

commit;
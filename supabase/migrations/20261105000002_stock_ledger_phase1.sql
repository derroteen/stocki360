-- ALREADY APPLIED to the live database (Nov 2026). Do NOT run this file again.
-- Stock ledger hardening, Phase 1.
-- Based on docs/live-db-snapshot.md; legacy movements are never rewritten.
-- create_purchase_with_items is explicitly assigned to postgres so its
-- SECURITY DEFINER writes work after authenticated table-write grants are removed.

begin;

alter table public.stock_movements
  add column source text not null default 'legacy',
  add column reason_code text,
  add column reference_type text,
  add column reference_id uuid,
  add column unit_cost numeric(12,2);

alter table public.stock_movements
  add constraint stock_movements_quantity_nonnegative_check
    check (quantity >= 0),
  add constraint stock_movements_source_check
    check (source in ('opening', 'purchase', 'sale', 'write_off', 'count_correction', 'customer_return', 'legacy')),
  add constraint stock_movements_reason_code_check
    check (reason_code is null or reason_code in ('damaged', 'expired', 'lost', 'own_use', 'supplier_return', 'other')),
  add constraint stock_movements_reference_type_check
    check (reference_type is null or reference_type in ('sale', 'purchase')),
  add constraint stock_movements_unit_cost_nonnegative_check
    check (unit_cost is null or unit_cost >= 0),
  add constraint stock_movements_sale_purchase_reference_check
    check (source not in ('sale', 'purchase') or reference_id is not null),
  add constraint stock_movements_write_off_reason_check
    check (source <> 'write_off' or (reason_code is not null and reason_code in ('damaged', 'expired', 'lost', 'own_use', 'supplier_return', 'other'))),
  add constraint stock_movements_write_off_note_check
    check (source <> 'write_off' or reason_code not in ('lost', 'other') or nullif(btrim(note), '') is not null);

create unique index stock_movements_one_opening_per_product_uidx
  on public.stock_movements (product_id)
  where source = 'opening';

create or replace function public.record_stock_movement_internal(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_note text,
  p_source text,
  p_reason_code text,
  p_reference_type text,
  p_reference_id uuid,
  p_unit_cost numeric(12,2),
  p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_business_id uuid;
  v_is_active boolean;
  v_last_adjustment_at timestamptz;
  v_current_stock bigint := 0;
begin
  if p_idempotency_key is null then
    raise exception 'Idempotency key is required';
  end if;

  if exists (
    select 1
    from public.stock_movements sm
    where sm.idempotency_key = p_idempotency_key
  ) then
    return;
  end if;

  if p_source is null or p_source not in ('opening', 'purchase', 'sale', 'write_off', 'count_correction', 'customer_return', 'legacy') then
    raise exception 'Invalid stock movement source';
  end if;

  if p_source in ('sale', 'purchase') and p_reference_id is null then
    raise exception 'Sale and purchase movements require a reference id';
  end if;

  if p_reference_type is not null and p_reference_type not in ('sale', 'purchase') then
    raise exception 'Invalid stock movement reference type';
  end if;

  if p_source = 'sale' and p_reference_type is distinct from 'sale' then
    raise exception 'Sale movements require a sale reference type';
  end if;

  if p_source = 'purchase' and p_reference_type is distinct from 'purchase' then
    raise exception 'Purchase movements require a purchase reference type';
  end if;

  if p_source = 'write_off' and (p_reason_code is null or p_reason_code not in ('damaged', 'expired', 'lost', 'own_use', 'supplier_return', 'other')) then
    raise exception 'A valid reason code is required for write-offs';
  end if;

  if p_movement_type is null or p_movement_type not in ('in', 'out', 'adjustment') then
    raise exception 'Invalid movement type';
  end if;

  if p_movement_type in ('in', 'out') and (p_quantity is null or p_quantity <= 0) then
    raise exception 'Quantity must be greater than zero for % movements', p_movement_type;
  end if;

  if p_movement_type = 'adjustment' and (p_quantity is null or p_quantity < 0) then
    raise exception 'Adjustment quantity cannot be negative';
  end if;

  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'Unit cost cannot be negative';
  end if;

  select p.business_id, p.is_active
  into v_business_id, v_is_active
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found for active business.';
  end if;

  if not v_is_active then
    raise exception 'Archived products cannot receive new stock movements.';
  end if;

  if p_movement_type = 'out' then
    select max(sm.created_at)
    into v_last_adjustment_at
    from public.stock_movements sm
    where sm.product_id = p_product_id
      and sm.movement_type = 'adjustment';

    select coalesce(sum(
      case
        when sm.movement_type = 'in' then sm.quantity
        when sm.movement_type = 'out' then -sm.quantity
        when sm.movement_type = 'adjustment' then sm.quantity
        else 0
      end
    ), 0)
    into v_current_stock
    from public.stock_movements sm
    where sm.product_id = p_product_id
      and (v_last_adjustment_at is null or sm.created_at >= v_last_adjustment_at);

    if p_quantity > v_current_stock then
      raise exception 'Insufficient stock';
    end if;
  end if;

  insert into public.stock_movements (
    product_id, movement_type, quantity, note, idempotency_key,
    created_by, created_by_email, source, reason_code, reference_type,
    reference_id, unit_cost
  )
  values (
    p_product_id, p_movement_type, p_quantity, p_note, p_idempotency_key,
    auth.uid(), auth.jwt() ->> 'email', p_source, p_reason_code,
    p_reference_type, p_reference_id, p_unit_cost
  )
  on conflict (idempotency_key)
  where idempotency_key is not null
  do nothing;
end;
$function$;

revoke all on function public.record_stock_movement_internal(uuid, text, integer, text, text, text, text, uuid, numeric, uuid) from public;
revoke all on function public.record_stock_movement_internal(uuid, text, integer, text, text, text, text, uuid, numeric, uuid) from anon;
revoke all on function public.record_stock_movement_internal(uuid, text, integer, text, text, text, text, uuid, numeric, uuid) from authenticated;

create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_note text default null::text,
  p_idempotency_key uuid default null::uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_business_id uuid;
  v_is_active boolean;
begin
  select p.business_id, p.is_active
  into v_business_id, v_is_active
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found or you are not authorized to record stock movements.';
  end if;

  if not public.has_business_role(v_business_id, array['owner', 'admin', 'storekeeper']) then
    raise exception 'Product not found or you are not authorized to record stock movements.';
  end if;

  if p_idempotency_key is null then
    raise exception 'Idempotency key is required';
  end if;

  if exists (
    select 1 from public.stock_movements sm
    where sm.idempotency_key = p_idempotency_key
  ) then
    return;
  end if;

  if p_movement_type is null or p_movement_type not in ('in', 'out', 'adjustment') then
    raise exception 'Invalid movement type';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if not v_is_active then
    raise exception 'Archived products cannot receive new stock movements.';
  end if;

  perform public.record_stock_movement_internal(
    p_product_id, p_movement_type, p_quantity, p_note,
    'legacy', null, null, null, null, p_idempotency_key
  );
end;
$function$;

revoke all on function public.record_stock_movement(uuid, text, integer, text, uuid) from public;
revoke all on function public.record_stock_movement(uuid, text, integer, text, uuid) from anon;
grant execute on function public.record_stock_movement(uuid, text, integer, text, uuid) to authenticated;

create or replace function public.record_manual_stock_movement(
  p_product_id uuid,
  p_kind text,
  p_quantity integer,
  p_reason_code text,
  p_note text,
  p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  -- Change role policy here; these are the only role lists used below.
  c_opening_roles constant text[] := array['owner', 'admin', 'storekeeper'];
  c_correction_roles constant text[] := array['owner', 'admin'];
  v_business_id uuid;
  v_is_active boolean;
  v_cost_price numeric(12,2);
  v_current_stock bigint := 0;
  v_difference bigint;
  v_movement_type text;
  v_source text;
begin
  if p_kind is null or p_kind not in ('opening', 'write_off', 'count') then
    raise exception 'Invalid manual stock movement kind';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Quantity cannot be negative';
  end if;

  if p_kind = 'opening' and p_quantity <= 0 then
    raise exception 'Opening stock quantity must be greater than zero.';
  end if;

  select p.business_id, p.is_active, p.cost_price
  into v_business_id, v_is_active, v_cost_price
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found for active business.';
  end if;

  if p_kind = 'opening' then
    if not public.has_business_role(v_business_id, c_opening_roles) then
      raise exception 'Only an owner, admin, or storekeeper may record opening stock.';
    end if;
  else
    if not public.has_business_role(v_business_id, c_correction_roles) then
      if p_kind = 'write_off' then
        raise exception 'Only an owner or admin may record a write-off.';
      else
        raise exception 'Only an owner or admin may record a stock count.';
      end if;
    end if;
  end if;

  if p_idempotency_key is null then
    raise exception 'Idempotency key is required';
  end if;

  if exists (
    select 1
    from public.stock_movements sm
    where sm.idempotency_key = p_idempotency_key
  ) then
    return;
  end if;

  if not v_is_active then
    raise exception 'Archived products cannot receive new stock movements.';
  end if;

  if p_kind = 'opening' then
    if exists (select 1 from public.stock_movements sm where sm.product_id = p_product_id) then
      raise exception 'Opening stock can only be recorded for a product with no movements.';
    end if;

    v_movement_type := 'adjustment';
    v_source := 'opening';
  elsif p_kind = 'write_off' then
    if p_reason_code is null or p_reason_code not in ('damaged', 'expired', 'lost', 'own_use', 'supplier_return', 'other') then
      raise exception 'A valid reason code is required for write-offs.';
    end if;

    if p_reason_code in ('lost', 'other') and nullif(btrim(p_note), '') is null then
      raise exception 'A non-empty note is required for write-offs with reason lost or other.';
    end if;

    select coalesce(ps.current_stock, 0)
    into v_current_stock
    from public.product_stock_levels ps
    where ps.product_id = p_product_id;

    if p_quantity <= 0 then
      raise exception 'Write-off quantity must be greater than zero.';
    end if;

    if p_quantity > v_current_stock then
      raise exception 'Write-off quantity exceeds current stock.';
    end if;

    v_movement_type := 'out';
    v_source := 'write_off';
  else
    select coalesce(ps.current_stock, 0)
    into v_current_stock
    from public.product_stock_levels ps
    where ps.product_id = p_product_id;

    v_difference := p_quantity - v_current_stock;
    if v_difference <> 0 and nullif(btrim(p_note), '') is null then
      raise exception 'A note is required when a stock count changes the quantity.';
    end if;

    v_movement_type := 'adjustment';
    v_source := 'count_correction';
  end if;

  perform public.record_stock_movement_internal(
    p_product_id,
    v_movement_type,
    p_quantity,
    p_note,
    v_source,
    case when p_kind = 'write_off' then p_reason_code else null end,
    null,
    null,
    v_cost_price,
    p_idempotency_key
  );
end;
$function$;

revoke all on function public.record_manual_stock_movement(uuid, text, integer, text, text, uuid) from public;
revoke all on function public.record_manual_stock_movement(uuid, text, integer, text, text, uuid) from anon;
grant execute on function public.record_manual_stock_movement(uuid, text, integer, text, text, uuid) to authenticated;

create or replace function public.create_purchase_with_items(
  p_business_id uuid,
  p_supplier_id uuid,
  p_reference_number text,
  p_items jsonb,
  p_idempotency_key uuid,
  p_purchase_date timestamp with time zone default now(),
  p_notes text default null::text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_existing_purchase_id uuid;
  v_purchase_id uuid;
  v_total_amount numeric(12,2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_entry_mode text;
  v_quantity integer;
  v_unit_cost numeric(12,2);
  v_package_quantity integer;
  v_package_unit_cost numeric(12,2);
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

  select id into v_existing_purchase_id
  from public.purchases
  where idempotency_key = p_idempotency_key;

  if found then
    return v_existing_purchase_id;
  end if;

  if not public.has_business_role(p_business_id, array['owner', 'admin', 'storekeeper']) then
    raise exception 'You are not authorized to record purchases for this business.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one purchase item is required.';
  end if;

  v_item_count := jsonb_array_length(p_items);

  select count(distinct (elem->>'product_id'))
  into v_distinct_product_count
  from jsonb_array_elements(p_items) elem;

  if v_distinct_product_count <> v_item_count then
    raise exception 'Duplicate product detected. Each product may only be added once per purchase.';
  end if;

  if p_supplier_id is not null then
    if not exists (
      select 1 from public.suppliers s
      where s.id = p_supplier_id
        and s.business_id = p_business_id
    ) then
      raise exception 'Supplier not found for active business.';
    end if;
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

  insert into public.purchases (
    business_id, supplier_id, reference_number, purchase_date,
    notes, total_amount, created_by, idempotency_key
  )
  values (
    p_business_id, p_supplier_id, p_reference_number,
    coalesce(p_purchase_date, now()), p_notes,
    0, auth.uid(), p_idempotency_key
  )
  returning id into v_purchase_id;

  v_movement_note := coalesce('Purchase Ref: ' || p_reference_number, 'Purchase #' || left(v_purchase_id::text, 8));

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_entry_mode := coalesce(v_item->>'entry_mode', 'individual');

    if v_entry_mode not in ('individual', 'package') then
      raise exception 'Invalid entry_mode for product %.', v_product_id;
    end if;

    if v_entry_mode = 'package' then
      v_package_quantity := (v_item->>'package_quantity')::integer;
      v_package_unit_cost := (v_item->>'package_unit_cost')::numeric;

      if v_package_quantity is null or v_package_quantity <= 0 then
        raise exception 'Package quantity must be a whole positive number for product %.', v_product_id;
      end if;

      if v_package_unit_cost is null or v_package_unit_cost < 0 then
        raise exception 'Package unit cost cannot be negative for product %.', v_product_id;
      end if;

      select p.package_unit, p.units_per_package
      into v_product_package_unit, v_product_units_per_package
      from public.products p
      where p.id = v_product_id;

      if v_product_package_unit is null or v_product_units_per_package is null then
        raise exception 'Product % does not have bulk packaging configured.', v_product_id;
      end if;

      v_quantity := v_package_quantity * v_product_units_per_package;
      v_unit_cost := round(v_package_unit_cost / v_product_units_per_package, 2);

      insert into public.purchase_items (
        purchase_id, product_id, quantity, unit_cost,
        entry_mode, package_quantity, package_unit_snapshot,
        units_per_package_snapshot, package_unit_cost
      )
      values (
        v_purchase_id, v_product_id, v_quantity, v_unit_cost,
        'package', v_package_quantity, v_product_package_unit,
        v_product_units_per_package, round(v_package_unit_cost, 2)
      );
    else
      v_quantity := (v_item->>'quantity')::integer;
      v_unit_cost := (v_item->>'unit_cost')::numeric;

      if v_quantity is null or v_quantity <= 0 then
        raise exception 'Item quantity must be a whole positive number for product %.', v_product_id;
      end if;

      if v_unit_cost is null or v_unit_cost < 0 then
        raise exception 'Item unit cost cannot be negative for product %.', v_product_id;
      end if;

      insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost, entry_mode)
      values (v_purchase_id, v_product_id, v_quantity, round(v_unit_cost, 2), 'individual');
    end if;

    v_total_amount := v_total_amount + (v_quantity * v_unit_cost);
    v_movement_key := md5(p_idempotency_key::text || ':' || v_product_id::text)::uuid;

    perform public.record_stock_movement_internal(
      v_product_id, 'in', v_quantity, v_movement_note,
      'purchase', null, 'purchase', v_purchase_id, null, v_movement_key
    );
  end loop;

  update public.purchases
  set total_amount = round(v_total_amount, 2)
  where id = v_purchase_id;

  return v_purchase_id;
end;
$function$;

alter function public.create_purchase_with_items(uuid, uuid, text, jsonb, uuid, timestamptz, text) owner to postgres;

revoke all on function public.create_purchase_with_items(uuid, uuid, text, jsonb, uuid, timestamptz, text) from public;
revoke all on function public.create_purchase_with_items(uuid, uuid, text, jsonb, uuid, timestamptz, text) from anon;
grant execute on function public.create_purchase_with_items(uuid, uuid, text, jsonb, uuid, timestamptz, text) to authenticated;

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
security definer
set search_path = public
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

    perform public.record_stock_movement_internal(
      v_product_id, 'out', v_quantity, v_movement_note,
      'sale', null, 'sale', v_sale_id, null, v_movement_key
    );
  end loop;

  update public.sales
  set total_amount = round(v_total_amount, 2)
  where id = v_sale_id;

  return v_sale_id;
end;
$function$;

revoke all on function public.create_sale_with_items(uuid, text, text, text, text, jsonb, uuid, timestamptz, text) from public;
revoke all on function public.create_sale_with_items(uuid, text, text, text, text, jsonb, uuid, timestamptz, text) from anon;
grant execute on function public.create_sale_with_items(uuid, text, text, text, text, jsonb, uuid, timestamptz, text) to authenticated;

drop policy if exists purchases_insert_ops_roles on public.purchases;
drop policy if exists purchases_update_ops_roles on public.purchases;
drop policy if exists purchase_items_insert_ops_roles on public.purchase_items;
revoke insert, update on table public.purchases from authenticated;
revoke insert, update on table public.purchase_items from authenticated;

create or replace view public.stock_movement_deltas
with (security_invoker = true)
as
with numbered as (
  select sm.*,
         sum(case when sm.movement_type = 'adjustment' then 1 else 0 end)
           over (partition by sm.product_id order by sm.created_at, sm.id) as segment
  from public.stock_movements sm
),
running as (
  select n.*,
         coalesce(max(case when n.movement_type = 'adjustment' then n.quantity end)
           over (partition by n.product_id, n.segment), 0)::bigint as baseline,
         coalesce(sum(case n.movement_type when 'in' then n.quantity
                                           when 'out' then -n.quantity else 0 end)
           over (partition by n.product_id, n.segment order by n.created_at, n.id), 0)::bigint as moved
  from numbered n
),
after_calc as (
  select r.*, (r.baseline + r.moved) as stock_after_calc from running r
)
select a.id, a.product_id, a.movement_type, a.quantity, a.source, a.reason_code,
       a.reference_type, a.reference_id, a.unit_cost, a.note,
       a.created_at, a.created_by, a.created_by_email,
       coalesce(lag(a.stock_after_calc) over w, 0) as stock_before,
       a.stock_after_calc as stock_after,
       a.stock_after_calc - coalesce(lag(a.stock_after_calc) over w, 0) as delta
from after_calc a
window w as (partition by a.product_id order by a.created_at, a.id);

revoke all on public.stock_movement_deltas from public;
revoke all on public.stock_movement_deltas from anon;
grant select on public.stock_movement_deltas to authenticated;

create or replace function public.stock_reconciliation(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  product_id uuid,
  product_name text,
  opening_balance bigint,
  opening_entries bigint,
  purchases bigint,
  sales bigint,
  write_offs bigint,
  count_corrections bigint,
  unclassified_legacy bigint,
  closing bigint,
  write_off_cost numeric,
  count_correction_cost numeric,
  unexplained_difference bigint
)
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not public.has_business_role(p_business_id, array['owner', 'admin']) then
    raise exception 'Only an owner or admin may view stock reconciliation.';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'A valid reconciliation period is required (p_to must be on or after p_from).';
  end if;

  return query
  with business_products as (
    select p.id as pid, p.name as pname
    from public.products p
    where p.business_id = p_business_id
  )
  select
    bp.pid,
    bp.pname,
    coalesce(opening.stock_after, 0)::bigint,
    coalesce(totals.opening_entries, 0)::bigint,
    coalesce(totals.purchases, 0)::bigint,
    coalesce(totals.sales, 0)::bigint,
    coalesce(totals.write_offs, 0)::bigint,
    coalesce(totals.count_corrections, 0)::bigint,
    coalesce(totals.unclassified_legacy, 0)::bigint,
    coalesce(closing.stock_after, 0)::bigint,
    coalesce(totals.write_off_cost, 0)::numeric,
    coalesce(totals.count_correction_cost, 0)::numeric,
    (
      coalesce(closing.stock_after, 0)
      - (
        coalesce(opening.stock_after, 0)
        + coalesce(totals.opening_entries, 0)
        + coalesce(totals.purchases, 0)
        - coalesce(totals.sales, 0)
        - coalesce(totals.write_offs, 0)
        + coalesce(totals.count_corrections, 0)
        + coalesce(totals.unclassified_legacy, 0)
      )
    )::bigint
  from business_products bp
  left join lateral (
    select d.stock_after
    from public.stock_movement_deltas d
    where d.product_id = bp.pid
      and d.created_at < p_from
    order by d.created_at desc, d.id desc
    limit 1
  ) opening on true
  left join lateral (
    select d.stock_after
    from public.stock_movement_deltas d
    where d.product_id = bp.pid
      and d.created_at < p_to
    order by d.created_at desc, d.id desc
    limit 1
  ) closing on true
  left join lateral (
    select
      sum(d.delta) filter (where d.source = 'opening') as opening_entries,
      sum(d.delta) filter (where d.source = 'purchase') as purchases,
      -sum(d.delta) filter (where d.source = 'sale') as sales,
      -sum(d.delta) filter (where d.source = 'write_off') as write_offs,
      sum(d.delta) filter (where d.source = 'count_correction') as count_corrections,
      sum(d.delta) filter (where d.source = 'legacy') as unclassified_legacy,
      -sum(d.delta * d.unit_cost) filter (where d.source = 'write_off') as write_off_cost,
      sum(d.delta * d.unit_cost) filter (where d.source = 'count_correction') as count_correction_cost
    from public.stock_movement_deltas d
    where d.product_id = bp.pid
      and d.created_at >= p_from
      and d.created_at < p_to
  ) totals on true
  order by bp.pname, bp.pid;
end;
$function$;

revoke all on function public.stock_reconciliation(uuid, timestamptz, timestamptz) from public;
revoke all on function public.stock_reconciliation(uuid, timestamptz, timestamptz) from anon;
grant execute on function public.stock_reconciliation(uuid, timestamptz, timestamptz) to authenticated;

commit;

-- ============================================================================
-- 0017 — Price per-unit services by their actual size.
--
-- create_booking priced every line as `price * qty`. For the six services with
-- price_unit <> 'fixed' that billed the *rate*, not the job:
--
--   Exterior Cleaning   ₹5 / sq. ft.   → a ₹5 order
--   Marble & Floor      ₹3 / sq. ft.   → a ₹3 order
--   Professional Painting ₹7 / sq. ft. → a ₹7 order
--   Window Cleaning     ₹25 / sq. ft.  → a ₹25 order
--   Carpet Shampooing   ₹499 / sq. yd. → a ₹499 order
--   Curtain Cleaning    ₹99 / panel    → a ₹99 order
--
-- Items may now carry `units` (area in sq ft / yd, or a panel count). Per-unit
-- services require it; fixed-price services ignore it.
-- ============================================================================

alter table public.order_items
  add column if not exists units numeric(10, 2) not null default 1;

comment on column public.order_items.units is
  'Quantity of the priced unit (sq ft, sq yd, panels). Always 1 for fixed-price services.';

create or replace function public.create_booking(
  p_name text,
  p_phone text,
  p_email text,
  p_city text,
  p_address text,
  p_scheduled_date date,
  p_items jsonb,
  p_notes text default null,
  p_slot text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid         uuid := auth.uid();
  v_customer_id uuid;
  v_order_id    uuid;
  v_order_no    text;
  v_gross       numeric(10,2) := 0;
  v_total       numeric(10,2);
  v_taxable     numeric(10,2);
  v_tax         numeric(10,2);
  v_item        jsonb;
  v_service     services%rowtype;
  v_qty         int;
  v_units       numeric(10,2);
  v_line_total  numeric(10,2);
  v_name        text := trim(p_name);
  v_phone       text := trim(p_phone);
  v_email       text := nullif(trim(p_email), '');
  v_address     text := trim(p_address);
begin
  if v_uid is null then
    raise exception 'Please sign in to place a booking';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'No items in booking';
  end if;
  if coalesce(v_name, '') = '' or coalesce(v_phone, '') = '' then
    raise exception 'Name and phone are required';
  end if;

  select id into v_customer_id from customers where auth_user_id = v_uid limit 1;

  if v_customer_id is not null then
    update customers set
      name  = v_name,
      email = coalesce(v_email, email),
      city  = coalesce(p_city, city),
      phone = case
                when v_phone = phone then phone
                when exists (select 1 from customers c2 where c2.phone = v_phone and c2.id <> v_customer_id) then phone
                else v_phone
              end
    where id = v_customer_id;
  else
    if exists (
      select 1 from customers
      where phone = v_phone and auth_user_id is not null and auth_user_id <> v_uid
    ) then
      raise exception 'This phone number is already linked to a different account';
    end if;
    update customers set
      auth_user_id = v_uid, name = v_name,
      email = coalesce(v_email, email), city = coalesce(p_city, city)
    where phone = v_phone and auth_user_id is null
    returning id into v_customer_id;
    if v_customer_id is null then
      insert into customers (name, phone, email, city, auth_user_id)
      values (v_name, v_phone, v_email, p_city, v_uid)
      returning id into v_customer_id;
    end if;
  end if;

  insert into orders (customer_id, status, scheduled_date, scheduled_slot, city, address,
                      subtotal, tax, total, source, notes)
  values (v_customer_id, 'pending', p_scheduled_date, nullif(trim(p_slot), ''), p_city, v_address,
          0, 0, 0, 'website', nullif(trim(p_notes), ''))
  returning id, order_number into v_order_id, v_order_no;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);
    select * into v_service from services
      where id = (v_item->>'service_id')::uuid and is_active = true;
    if not found then
      raise exception 'Service % is not available', v_item->>'service_id';
    end if;

    if v_service.price_unit = 'fixed' then
      v_units := 1;
    else
      v_units := (v_item->>'units')::numeric;
      if v_units is null or v_units <= 0 then
        raise exception '% is priced per unit — please tell us the area or quantity', v_service.name;
      end if;
      -- Guard against a fat-fingered area turning into a lakh-rupee order.
      if v_units > 100000 then
        raise exception 'That area looks too large — please call us for a site visit';
      end if;
    end if;

    v_line_total := round(v_service.price * v_units * v_qty, 2);
    v_gross := v_gross + v_line_total;
    insert into order_items (order_id, service_id, service_name, unit_price, qty, units, line_total)
    values (v_order_id, v_service.id, v_service.name, v_service.price, v_qty, v_units, v_line_total);
  end loop;

  v_total   := round(v_gross, 2);
  v_taxable := round(v_total / 1.18, 2);
  v_tax     := v_total - v_taxable;
  update orders set subtotal = v_taxable, tax = v_tax, total = v_total where id = v_order_id;

  if v_address <> '' and not exists (
    select 1 from addresses where customer_id = v_customer_id and full_address = v_address
  ) then
    insert into addresses (customer_id, label, full_address, city, is_default)
    values (
      v_customer_id, 'Home', v_address, p_city,
      not exists (select 1 from addresses where customer_id = v_customer_id)
    );
  end if;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_no);
end;
$function$;

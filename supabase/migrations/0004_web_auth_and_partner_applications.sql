-- ============================================================================
-- Prime Home Care — Website auth + partner applications (0004)
-- Applied to the live project on 2026-07-08.
--
-- 1. Customers are linked to their Google (auth.users) identity.
-- 2. create_booking() now REQUIRES an authenticated user — the website gates
--    checkout behind Google OAuth, and this enforces it server-side too.
-- 3. submit_vendor_application() lets the public "Become a Partner" page create
--    a `pending` vendor that shows up in the CRM onboarding pipeline.
-- ============================================================================

alter table customers add column if not exists auth_user_id uuid references auth.users(id);
create index if not exists idx_customers_auth_user on customers (auth_user_id);

alter table vendors add column if not exists application_note text;

-- ─── Booking now requires sign-in ────────────────────────────────────────────

create or replace function create_booking(
  p_name           text,
  p_phone          text,
  p_email          text,
  p_city           text,
  p_address        text,
  p_scheduled_date date,
  p_items          jsonb,
  p_notes          text default null
) returns jsonb
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid         uuid := auth.uid();
  v_customer_id uuid;
  v_order_id    uuid;
  v_order_no    text;
  v_subtotal    numeric(10,2) := 0;
  v_item        jsonb;
  v_service     services%rowtype;
  v_qty         int;
  v_line_total  numeric(10,2);
begin
  if v_uid is null then
    raise exception 'Please sign in to place a booking';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'No items in booking';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Name and phone are required';
  end if;

  insert into customers (name, phone, email, city, auth_user_id)
  values (trim(p_name), trim(p_phone), nullif(trim(p_email), ''), p_city, v_uid)
  on conflict (phone) do update
    set name         = excluded.name,
        email        = coalesce(excluded.email, customers.email),
        city         = coalesce(excluded.city, customers.city),
        auth_user_id = coalesce(excluded.auth_user_id, customers.auth_user_id)
  returning id into v_customer_id;

  insert into orders (customer_id, status, scheduled_date, city, address,
                      subtotal, total, source, notes)
  values (v_customer_id, 'pending', p_scheduled_date, p_city, p_address,
          0, 0, 'website', nullif(trim(p_notes), ''))
  returning id, order_number into v_order_id, v_order_no;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);
    select * into v_service from services
      where id = (v_item->>'service_id')::uuid and is_active = true;
    if not found then
      raise exception 'Service % is not available', v_item->>'service_id';
    end if;
    v_line_total := v_service.price * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    insert into order_items (order_id, service_id, service_name, unit_price, qty, line_total)
    values (v_order_id, v_service.id, v_service.name, v_service.price, v_qty, v_line_total);
  end loop;

  update orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;
  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_no);
end;
$$;

grant execute on function create_booking(text, text, text, text, text, date, jsonb, text)
  to anon, authenticated;

-- ─── Public "Become a Partner" application ───────────────────────────────────

create or replace function submit_vendor_application(
  p_name  text,
  p_phone text,
  p_email text,
  p_city  text,
  p_note  text default null
) returns jsonb
  language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Name and phone are required';
  end if;
  insert into vendors (name, phone, email, city, status, application_note)
  values (trim(p_name), trim(p_phone), nullif(trim(p_email), ''),
          nullif(trim(p_city), ''), 'pending', nullif(trim(p_note), ''))
  returning id into v_id;
  return jsonb_build_object('vendor_id', v_id);
end;
$$;

grant execute on function submit_vendor_application(text, text, text, text, text)
  to anon, authenticated;

-- ============================================================================
-- MyPrimeCompany — Booking hardening: identity-keyed customers + GST (0006)
--
-- Two Tier-0 correctness fixes to create_booking():
--
-- 1. ANTI-HIJACK. The previous version upserted the customer `on conflict
--    (phone)`, so anyone who signed in and typed someone else's phone number
--    would overwrite that person's name/email/city and reassign their record to
--    the attacker's Google account. Customers are now resolved by IDENTITY
--    (auth.uid()); phone is treated as mutable profile data. A phone already
--    linked to a different account is rejected, not stolen.
--
-- 2. GST (tax-inclusive). Catalog prices already include 18% GST. total is
--    unchanged (what the customer pays); we store the derived taxable value in
--    `subtotal` and the contained GST in `tax`. Mirrors packages/shared/tax.ts.
-- ============================================================================

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
  v_gross       numeric(10,2) := 0;
  v_total       numeric(10,2);
  v_taxable     numeric(10,2);
  v_tax         numeric(10,2);
  v_item        jsonb;
  v_service     services%rowtype;
  v_qty         int;
  v_line_total  numeric(10,2);
  v_name        text := trim(p_name);
  v_phone       text := trim(p_phone);
  v_email       text := nullif(trim(p_email), '');
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

  -- ── Resolve customer by IDENTITY, never by phone alone ─────────────────────
  select id into v_customer_id from customers where auth_user_id = v_uid limit 1;

  if v_customer_id is not null then
    -- Known identity → update this user's own profile only. Adopt the typed
    -- phone only when it is free (phone is UNIQUE; never clobber another row).
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
    -- Unknown identity. A phone already tied to a DIFFERENT account is off limits.
    if exists (
      select 1 from customers
      where phone = v_phone and auth_user_id is not null and auth_user_id <> v_uid
    ) then
      raise exception 'This phone number is already linked to a different account';
    end if;

    -- Claim an existing UNCLAIMED record with this phone (CRM-created, or a
    -- pre-auth booking), otherwise create a fresh one.
    update customers set
      auth_user_id = v_uid,
      name  = v_name,
      email = coalesce(v_email, email),
      city  = coalesce(p_city, city)
    where phone = v_phone and auth_user_id is null
    returning id into v_customer_id;

    if v_customer_id is null then
      insert into customers (name, phone, email, city, auth_user_id)
      values (v_name, v_phone, v_email, p_city, v_uid)
      returning id into v_customer_id;
    end if;
  end if;

  -- ── Order shell ────────────────────────────────────────────────────────────
  insert into orders (customer_id, status, scheduled_date, city, address,
                      subtotal, tax, total, source, notes)
  values (v_customer_id, 'pending', p_scheduled_date, p_city, p_address,
          0, 0, 0, 'website', nullif(trim(p_notes), ''))
  returning id, order_number into v_order_id, v_order_no;

  -- ── Line items, re-priced server-side from the live catalog ────────────────
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);
    select * into v_service from services
      where id = (v_item->>'service_id')::uuid and is_active = true;
    if not found then
      raise exception 'Service % is not available', v_item->>'service_id';
    end if;
    v_line_total := v_service.price * v_qty;
    v_gross := v_gross + v_line_total;
    insert into order_items (order_id, service_id, service_name, unit_price, qty, line_total)
    values (v_order_id, v_service.id, v_service.name, v_service.price, v_qty, v_line_total);
  end loop;

  -- ── GST (tax-inclusive): prices already include 18% GST ────────────────────
  v_total   := round(v_gross, 2);
  v_taxable := round(v_total / 1.18, 2);
  v_tax     := v_total - v_taxable;

  update orders
     set subtotal = v_taxable,   -- taxable value (net of GST)
         tax      = v_tax,       -- GST contained in the price
         total    = v_total      -- what the customer pays (unchanged)
   where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_no);
end;
$$;

grant execute on function create_booking(text, text, text, text, text, date, jsonb, text)
  to anon, authenticated;

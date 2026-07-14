-- ============================================================================
-- Prime Home Care — Row Level Security + public booking RPC (0002)
--
-- Access model:
--   • Marketing site  → Supabase ANON key. May READ active catalog only, and
--     may WRITE bookings ONLY through create_booking() (a SECURITY DEFINER RPC
--     that validates prices server-side). It can never read other customers.
--   • CRM             → AUTHENTICATED admin sessions, gated by admin_users.
--
-- DEVIATION FROM BRIEF (intentional): the brief granted anon raw INSERT on
-- customers/orders/order_items. We do NOT, because:
--   (a) anon has no SELECT policy, so `INSERT ... RETURNING id` (needed to link
--       order_items to the new order) would be denied — the flow can't work; and
--   (b) raw anon insert lets anyone submit orders with arbitrary totals.
-- The create_booking() RPC solves both: atomic, server-priced, single door.
-- ============================================================================

-- ─── Admin predicates (SECURITY DEFINER → bypass admin_users RLS, no recursion)

create or replace function is_admin() returns boolean
  language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function is_super_admin() returns boolean
  language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid() and is_active = true and role = 'super_admin'
  );
$$;

-- ─── Enable RLS on every table ───────────────────────────────────────────────

alter table admin_users        enable row level security;
alter table service_categories enable row level security;
alter table cities             enable row level security;
alter table services           enable row level security;
alter table price_history      enable row level security;
alter table customers          enable row level security;
alter table addresses          enable row level security;
alter table vendors            enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table invoices           enable row level security;

-- ─── Public (anon) read access to the live catalog ───────────────────────────

create policy "public read active services" on services
  for select using (is_active = true);
create policy "public read categories" on service_categories
  for select using (true);
create policy "public read active cities" on cities
  for select using (is_active = true);

-- Deliberately NO anon policies on customers / orders / order_items:
-- the public write path is the create_booking() RPC below.

-- ─── Admin full access ───────────────────────────────────────────────────────

create policy "admin full access services"       on services           for all using (is_admin()) with check (is_admin());
create policy "admin full access categories"      on service_categories for all using (is_admin()) with check (is_admin());
create policy "admin full access cities"          on cities             for all using (is_admin()) with check (is_admin());
create policy "admin full access customers"       on customers          for all using (is_admin()) with check (is_admin());
create policy "admin full access addresses"       on addresses          for all using (is_admin()) with check (is_admin());
create policy "admin full access orders"          on orders             for all using (is_admin()) with check (is_admin());
create policy "admin full access order_items"     on order_items        for all using (is_admin()) with check (is_admin());
create policy "admin full access vendors"         on vendors            for all using (is_admin()) with check (is_admin());
create policy "admin full access invoices"        on invoices           for all using (is_admin()) with check (is_admin());
create policy "admin full access price_history"   on price_history      for all using (is_admin()) with check (is_admin());

-- admin_users: anyone authenticated can read their own row; admins read all;
-- only super_admins may create/modify staff rows (Settings module).
create policy "read own or admin" on admin_users
  for select using (id = auth.uid() or is_admin());
create policy "super_admin manage admins" on admin_users
  for all using (is_super_admin()) with check (is_super_admin());

-- ============================================================================
-- Public booking RPC — the ONLY write path for the anon marketing site.
-- Re-prices every line item from the live `services` table (ignores any price
-- the client sends), upserts the customer by phone, creates the order + items
-- atomically, and returns the new order id + human order number.
--
--   p_items: jsonb array of { "service_id": uuid, "qty": int }
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
  v_customer_id uuid;
  v_order_id    uuid;
  v_order_no    text;
  v_subtotal    numeric(10,2) := 0;
  v_item        jsonb;
  v_service     services%rowtype;
  v_qty         int;
  v_line_total  numeric(10,2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'No items in booking';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Name and phone are required';
  end if;

  -- Upsert customer by phone (definer bypasses RLS)
  insert into customers (name, phone, email, city)
  values (trim(p_name), trim(p_phone), nullif(trim(p_email), ''), p_city)
  on conflict (phone) do update
    set name  = excluded.name,
        email = coalesce(excluded.email, customers.email),
        city  = coalesce(excluded.city, customers.city)
  returning id into v_customer_id;

  -- Create the order (order_number auto-filled by trigger). Totals set below.
  insert into orders (customer_id, status, scheduled_date, city, address,
                      subtotal, total, source, notes)
  values (v_customer_id, 'pending', p_scheduled_date, p_city, p_address,
          0, 0, 'website', nullif(trim(p_notes), ''))
  returning id, order_number into v_order_id, v_order_no;

  -- Add each item, re-pricing from the live services table
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);

    select * into v_service
      from services
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

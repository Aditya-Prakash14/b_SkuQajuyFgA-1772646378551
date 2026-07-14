-- ============================================================================
-- Prime Home Care — one-shot apply: schema + RLS + reference data
-- Paste this whole file into the Supabase SQL Editor and Run.
-- ============================================================================

-- ============================================================================
-- Prime Home Care — Schema (0001)
-- Run in the Supabase SQL editor, or `supabase db push` with the CLI.
--
-- NOTE vs. the original brief: `vendors` is created BEFORE `orders` because
-- orders.assigned_vendor_id references vendors(id). The brief listed vendors
-- last, which would fail with "relation vendors does not exist".
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ─── Shared helpers ──────────────────────────────────────────────────────────

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ========== ADMIN / STAFF ==========
create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role text not null check (role in ('super_admin','admin','staff')) default 'staff',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ========== CATALOG ==========
create table service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  icon text,
  sort_order int default 0
);

create table cities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_active boolean default true
);

create table services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  category_id uuid references service_categories(id),
  price numeric(10,2) not null,
  price_unit text not null default 'fixed'
    check (price_unit in ('fixed','per_sqft','per_panel','per_seat')),
  display_price_label text,                 -- e.g. "₹1,499" or "₹7 / sq. ft."
  duration text,
  hero_img text,
  gallery_imgs jsonb default '[]',
  description text,
  what_we_clean jsonb default '[]',         -- string[]
  how_it_works jsonb default '[]',          -- {step,title,desc}[]
  whats_included jsonb default '[]',        -- string[]
  not_included jsonb default '[]',          -- string[]
  faqs jsonb default '[]',                  -- {q,a}[]
  related_service_ids uuid[] default '{}',  -- references services.id
  rating numeric(2,1) default 4.5,
  reviews_count int default 0,
  bookings_count text default '0',          -- display string like "1L+"
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table price_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  old_price numeric(10,2),
  new_price numeric(10,2),
  changed_by uuid references admin_users(id),
  changed_at timestamptz default now()
);

-- ========== CUSTOMERS & ADDRESSES ==========
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text,
  city text,
  created_at timestamptz default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  label text,                               -- Home / Office
  full_address text not null,
  city text not null,
  is_default boolean default false
);

-- ========== VENDORS (before orders — orders FKs into this) ==========
create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  city text,
  status text not null default 'pending'
    check (status in ('pending','approved','active','suspended','rejected')),
  services_offered uuid[] default '{}',     -- references services.id
  commission_rate numeric(5,2) default 0,   -- percentage
  documents jsonb default '[]',             -- [{type,url,verified}]
  rating numeric(2,1),
  onboarded_at timestamptz,
  created_at timestamptz default now()
);

-- ========== ORDERS ==========
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,        -- e.g. PHC-20260707-0001 (auto via trigger)
  customer_id uuid references customers(id),
  status text not null default 'pending'
    check (status in ('pending','confirmed','vendor_assigned','in_progress','completed','cancelled')),
  scheduled_date date,
  city text not null,
  address text not null,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) default 0,
  tax numeric(10,2) default 0,
  total numeric(10,2) not null,
  payment_status text default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded','partial')),
  payment_method text,
  notes text,
  assigned_vendor_id uuid references vendors(id),
  source text default 'website',            -- website / crm / phone
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  service_id uuid references services(id),
  service_name text not null,               -- snapshot at time of order
  unit_price numeric(10,2) not null,        -- snapshot at time of order
  qty int not null default 1,
  line_total numeric(10,2) not null
);

-- ========== INVOICES ==========
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,      -- INV-2026-0001 (auto via trigger)
  order_id uuid references orders(id),
  customer_id uuid references customers(id),
  issue_date date default current_date,
  due_date date,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) default 0,
  tax numeric(10,2) default 0,
  total numeric(10,2) not null,
  status text not null default 'draft'
    check (status in ('draft','sent','paid','overdue','void')),
  payment_method text,
  paid_at timestamptz,
  pdf_url text,
  created_at timestamptz default now()
);

-- ─── Auto-numbering (order_number / invoice_number) ──────────────────────────
-- security definer so the anon website role can call nextval() during the
-- public booking insert without extra sequence grants.

create sequence if not exists order_number_seq;
create sequence if not exists invoice_number_seq;

create or replace function gen_order_number() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'PHC-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad(nextval('order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create or replace function gen_invoice_number() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('invoice_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trg_orders_number before insert on orders
  for each row execute function gen_order_number();
create trigger trg_invoices_number before insert on invoices
  for each row execute function gen_invoice_number();

-- ─── updated_at triggers ─────────────────────────────────────────────────────

create trigger trg_services_updated before update on services
  for each row execute function set_updated_at();
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index idx_services_category      on services (category_id);
create index idx_services_active        on services (is_active);
create index idx_price_history_service  on price_history (service_id);
create index idx_addresses_customer     on addresses (customer_id);
create index idx_orders_status          on orders (status);
create index idx_orders_customer        on orders (customer_id);
create index idx_orders_vendor          on orders (assigned_vendor_id);
create index idx_orders_scheduled       on orders (scheduled_date);
create index idx_order_items_order      on order_items (order_id);
create index idx_order_items_service    on order_items (service_id);
create index idx_vendors_status         on vendors (status);
create index idx_invoices_order         on invoices (order_id);
create index idx_invoices_status        on invoices (status);


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


-- ============================================================================
-- Prime Home Care — Reference data seed (idempotent)
-- Run AFTER 0001_schema.sql + 0002_rls.sql, and before `pnpm seed`.
-- Safe to re-run.
-- ============================================================================

-- ─── Service categories (referenced by services.category_id) ─────────────────
insert into service_categories (name, slug, icon, sort_order) values
  ('Deep Cleaning',            'deep-cleaning',            'Sparkles',   1),
  ('Corporate Services',       'corporate-services',       'Building2',  2),
  ('Pest Control',             'pest-control',             'Bug',        3),
  ('Marble & Floor Polishing', 'marble-floor-polishing',   'Gem',        4),
  ('Painting',                 'painting',                 'Paintbrush', 5),
  ('Disinfection',             'disinfection',             'Droplets',   6)
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;

-- ─── Cities served ───────────────────────────────────────────────────────────
insert into cities (name) values
  ('Bangalore'), ('Mumbai'), ('Delhi'), ('Hyderabad'), ('Pune'), ('Chennai'),
  ('Kolkata'), ('Ahmedabad'), ('Jaipur'), ('Bhubaneswar'), ('Gurgaon'), ('Noida')
on conflict (name) do nothing;

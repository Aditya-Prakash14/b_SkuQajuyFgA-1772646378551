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

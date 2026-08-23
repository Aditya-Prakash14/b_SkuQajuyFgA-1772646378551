-- ============================================================================
-- 0015 — Prime Now: on-demand hourly help.
--
-- A second business domain alongside scheduled Deep Cleaning. There is no
-- catalogue: the customer picks a time slot, ticks what needs doing, and the
-- request is dispatched to a vendor or in-house helper.
--
-- The website hands off to WhatsApp, but the request is recorded first so ops
-- has a queue and nothing lives only in a chat thread.
--
-- Intake is anon-callable (the form asks for a phone and address, not a login,
-- exactly like create_booking). The RPC is the only write path — the table
-- itself is closed to anon — and it validates before inserting.
-- ============================================================================

create sequence if not exists public.prime_now_request_seq;

create table if not exists public.prime_now_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique not null,
  -- Set when the requester happens to be signed in; the flow never requires it.
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  phone text not null,
  address text not null,
  city text,
  slot text not null check (slot in ('30m', '1h', '90m', 'half_day')),
  slot_minutes integer not null,
  price numeric(10, 2) not null,
  -- Free-form on purpose: the chip list is a UI convenience, not a taxonomy.
  tasks text[] not null default '{}',
  notes text,
  timing text not null check (timing in ('now', 'scheduled')),
  scheduled_for timestamptz,
  status text not null default 'new'
    check (status in ('new', 'dispatched', 'in_progress', 'completed', 'cancelled')),
  assigned_vendor_id uuid references public.vendors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prime_now_requests_status_idx
  on public.prime_now_requests (status, created_at desc);
create index if not exists prime_now_requests_vendor_idx
  on public.prime_now_requests (assigned_vendor_id)
  where assigned_vendor_id is not null;

-- PN-YYYYMMDD-0001, collision-free via the sequence (mirrors gen_order_number).
create or replace function public.gen_prime_now_number()
returns trigger
language plpgsql
as $$
begin
  if new.request_number is null or new.request_number = '' then
    new.request_number := 'PN-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYYMMDD')
                       || '-' || lpad(nextval('public.prime_now_request_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists prime_now_number on public.prime_now_requests;
create trigger prime_now_number before insert on public.prime_now_requests
  for each row execute function public.gen_prime_now_number();

create or replace function public.touch_prime_now_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prime_now_touch on public.prime_now_requests;
create trigger prime_now_touch before update on public.prime_now_requests
  for each row execute function public.touch_prime_now_updated_at();

alter table public.prime_now_requests enable row level security;

drop policy if exists "admin manages prime now" on public.prime_now_requests;
create policy "admin manages prime now" on public.prime_now_requests
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "vendor reads assigned prime now" on public.prime_now_requests;
create policy "vendor reads assigned prime now" on public.prime_now_requests
  for select using (assigned_vendor_id = public.current_vendor_id());

drop policy if exists "customer reads own prime now" on public.prime_now_requests;
create policy "customer reads own prime now" on public.prime_now_requests
  for select using (customer_id is not null and customer_id = public.current_customer_id());

-- Intake. Returns the request number so the page can show it and put it in the
-- WhatsApp message. No table grant to anon — this function is the only way in.
create or replace function public.create_prime_now_request(
  p_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_slot text,
  p_tasks text[],
  p_notes text,
  p_timing text,
  p_scheduled_for timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_minutes integer;
  v_price numeric(10, 2);
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_id uuid;
  v_number text;
  v_customer uuid := current_customer_id();
begin
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'Please tell us your name';
  end if;
  if length(v_phone) < 10 then
    raise exception 'Please enter a valid 10-digit phone number';
  end if;
  if btrim(coalesce(p_address, '')) = '' then
    raise exception 'Please enter the address';
  end if;
  if p_timing not in ('now', 'scheduled') then
    raise exception 'Choose when the helper should arrive';
  end if;
  if p_timing = 'scheduled' and p_scheduled_for is null then
    raise exception 'Pick a date and time for the visit';
  end if;

  -- Priced server-side: the browser never decides what a slot costs.
  select m, p into v_minutes, v_price
  from (values ('30m', 30, 199.00), ('1h', 60, 349.00), ('90m', 90, 499.00), ('half_day', 240, 1199.00))
       as t(s, m, p)
  where t.s = p_slot;
  if v_minutes is null then
    raise exception 'Choose how long you need the helper for';
  end if;

  insert into prime_now_requests
    (customer_id, name, phone, address, city, slot, slot_minutes, price,
     tasks, notes, timing, scheduled_for)
  values
    (v_customer, btrim(p_name), v_phone, btrim(p_address), nullif(btrim(coalesce(p_city, '')), ''),
     p_slot, v_minutes, v_price,
     coalesce(p_tasks, '{}'), nullif(btrim(coalesce(p_notes, '')), ''), p_timing,
     case when p_timing = 'scheduled' then p_scheduled_for end)
  returning id, request_number into v_id, v_number;

  return jsonb_build_object('id', v_id, 'request_number', v_number, 'price', v_price, 'minutes', v_minutes);
end;
$$;

revoke execute on function public.create_prime_now_request(text, text, text, text, text, text[], text, text, timestamptz) from public;
grant  execute on function public.create_prime_now_request(text, text, text, text, text, text[], text, text, timestamptz) to anon, authenticated;

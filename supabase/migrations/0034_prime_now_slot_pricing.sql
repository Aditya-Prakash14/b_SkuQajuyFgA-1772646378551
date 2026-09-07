-- 0034: Prime Now pricing moves into the database so the CRM controls it.
--
-- Until now the four slot rates lived as literals inside
-- create_prime_now_request() (and as display copies in the website and the
-- customer app). This migration makes prime_now_slots the single source of
-- truth: the RPC prices from the table, the clients display from the table,
-- and admins edit it from the CRM (Services & Pricing page).

create table if not exists prime_now_slots (
  id text primary key,
  label text not null,
  sublabel text not null default '',
  minutes integer not null check (minutes between 15 and 720),
  price numeric(10, 2) not null check (price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table prime_now_slots enable row level security;

-- Anyone may read the price list (it is public pricing on the website);
-- only admins may change it. Same pattern as services (0002).
create policy "public read prime_now_slots" on prime_now_slots
  for select using (true);
create policy "admin full access prime_now_slots" on prime_now_slots
  for all using (is_admin()) with check (is_admin());

grant select on prime_now_slots to anon, authenticated;
grant insert, update, delete on prime_now_slots to authenticated; -- RLS limits to admins

insert into prime_now_slots (id, label, sublabel, minutes, price, sort_order) values
  ('30m',      '30 minutes', 'A quick tidy-up',  30,  199.00, 1),
  ('1h',       '1 hour',     'Most popular',     60,  349.00, 2),
  ('90m',      '90 minutes', 'A thorough round', 90,  499.00, 3),
  ('half_day', 'Half day',   '4 hours',          240, 1199.00, 4)
on conflict (id) do nothing;

-- keep updated_at honest on edits
create or replace function public.touch_prime_now_slots() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_touch_prime_now_slots on prime_now_slots;
create trigger trg_touch_prime_now_slots
  before update on prime_now_slots
  for each row execute function public.touch_prime_now_slots();

-- Same signature as 0029, so create or replace is safe (standing rule 3).
-- The only change: the slot lookup reads prime_now_slots instead of a VALUES
-- list, and refuses slots switched off in the CRM.
create or replace function public.create_prime_now_request(
  p_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_slot text,
  p_tasks text[],
  p_notes text,
  p_timing text,
  p_scheduled_for timestamptz default null,
  p_source text default 'website'
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
  v_recent integer;
  v_open integer;
  v_source text := case when p_source in ('website', 'app', 'crm', 'phone') then p_source else 'website' end;
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

  select count(*) into v_recent
  from prime_now_requests
  where phone = v_phone and created_at > now() - interval '1 hour';
  if v_recent >= 3 then
    raise exception 'You have already sent a few requests in the last hour. Please call us on +91 73496 03429 and we will sort it out.';
  end if;

  select count(*) into v_open
  from prime_now_requests
  where phone = v_phone and status in ('new', 'dispatched', 'in_progress');
  if v_open >= 2 then
    raise exception 'You already have a request in progress. Please call us on +91 73496 03429 if you need another helper.';
  end if;

  select s.minutes, s.price into v_minutes, v_price
  from prime_now_slots s
  where s.id = p_slot and s.is_active;
  if v_minutes is null then
    raise exception 'Choose how long you need the helper for';
  end if;

  insert into prime_now_requests
    (customer_id, name, phone, address, city, slot, slot_minutes, price,
     tasks, notes, timing, scheduled_for, source)
  values
    (v_customer, btrim(p_name), v_phone, btrim(p_address), nullif(btrim(coalesce(p_city, '')), ''),
     p_slot, v_minutes, v_price,
     coalesce(p_tasks, '{}'), nullif(btrim(coalesce(p_notes, '')), ''), p_timing,
     case when p_timing = 'scheduled' then p_scheduled_for end, v_source)
  returning id, request_number into v_id, v_number;

  return jsonb_build_object('id', v_id, 'request_number', v_number, 'price', v_price, 'minutes', v_minutes);
end;
$$;

revoke execute on function public.create_prime_now_request(text, text, text, text, text, text[], text, text, timestamptz, text) from public;
grant  execute on function public.create_prime_now_request(text, text, text, text, text, text[], text, text, timestamptz, text) to anon, authenticated;

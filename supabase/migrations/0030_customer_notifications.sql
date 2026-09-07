-- ============================================================================
-- 0030 — Customer notifications (docs/customer-app-master-prompt.md Phase 2).
--
-- Until now nothing reached a customer automatically: notification_prefs
-- stored a push token that nothing read. This migration gives the database a
-- way to tell the customer's phone about every change to their booking.
--
--   1. "Helper on the way". The preference existed; the event did not. Rather
--      than widen orders.status (six check constraints, three apps), both job
--      tables gain en_route_at, and mark_en_route() lets the assigned partner
--      set it. For orders it also appends a booking_events row with status
--      'en_route' (that column is free text), so the customer timeline gets
--      the step without the order's own status changing.
--   2. my_jobs() returns en_route_at so the partner app can show the button
--      once. Return-type change ⇒ drop, then create.
--   3. notify-customer: a pg_net POST to the edge function of that name on
--      every booking_events insert and every Prime Now status / en_route
--      change. The function decides what (if anything) to send, gated by the
--      customer's preferences. A shared secret lives in Vault; the trigger
--      reads it from there and the function checks it through notify_secret(),
--      so no secret is ever pasted into SQL or an env file.
-- ============================================================================

create extension if not exists pg_net;

-- ── 1. On the way ───────────────────────────────────────────────────────────

alter table public.orders add column if not exists en_route_at timestamptz;
alter table public.prime_now_requests add column if not exists en_route_at timestamptz;

create or replace function public.mark_en_route(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_vendor uuid := current_vendor_id();
begin
  if v_vendor is null then
    raise exception 'No vendor profile for this account';
  end if;

  update orders
     set en_route_at = now()
   where id = p_job_id and assigned_vendor_id = v_vendor
     and status = 'vendor_assigned' and en_route_at is null;
  if found then
    insert into booking_events (order_id, status) values (p_job_id, 'en_route');
    return;
  end if;

  update prime_now_requests
     set en_route_at = now()
   where id = p_job_id and assigned_vendor_id = v_vendor
     and status = 'dispatched' and en_route_at is null;
  if not found then
    raise exception 'This job cannot be marked as on the way';
  end if;
end;
$$;

revoke execute on function public.mark_en_route(uuid) from public, anon;
grant  execute on function public.mark_en_route(uuid) to authenticated;

-- ── 2. my_jobs() carries en_route_at ────────────────────────────────────────

drop function if exists public.my_jobs();

create function public.my_jobs()
returns table (
  kind text,
  id uuid,
  order_number text,
  status text,
  scheduled_date date,
  scheduled_slot text,
  city text,
  address text,
  notes text,
  total numeric,
  payment_status text,
  payment_method text,
  customer_name text,
  customer_phone text,
  items jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  en_route_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select current_vendor_id() as vendor_id)
  select
    'deep_clean'::text as kind,
    o.id, o.order_number, o.status, o.scheduled_date, o.scheduled_slot,
    o.city, o.address, o.notes, o.total, o.payment_status, o.payment_method,
    c.name as customer_name, c.phone as customer_phone,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'service_name', i.service_name,
               'qty', i.qty,
               'units', i.units,
               'unit_price', i.unit_price,
               'line_total', i.line_total)
             order by i.service_name)
      from order_items i where i.order_id = o.id
    ), '[]'::jsonb) as items,
    o.created_at, o.updated_at, o.en_route_at
  from orders o
  join customers c on c.id = o.customer_id, me
  where o.assigned_vendor_id = me.vendor_id and me.vendor_id is not null

  union all

  select
    'prime_now'::text as kind,
    r.id, r.request_number,
    case r.status
      when 'dispatched' then 'vendor_assigned'
      else r.status
    end as status,
    case
      when r.timing = 'scheduled' and r.scheduled_for is not null
        then (r.scheduled_for at time zone 'Asia/Kolkata')::date
      else (r.created_at at time zone 'Asia/Kolkata')::date
    end as scheduled_date,
    case
      when r.timing = 'now' then 'ASAP — within the hour'
      else to_char(r.scheduled_for at time zone 'Asia/Kolkata', 'HH12:MI AM')
    end as scheduled_slot,
    r.city, r.address, r.notes, r.price as total,
    r.payment_status, r.payment_method,
    r.name as customer_name, r.phone as customer_phone,
    jsonb_build_array(jsonb_build_object(
      'service_name', 'Prime Now · ' || r.slot_minutes || ' min help',
      'qty', 1,
      'units', 1,
      'unit_price', r.price,
      'line_total', r.price,
      'tasks', to_jsonb(r.tasks))) as items,
    r.created_at, r.updated_at, r.en_route_at
  from prime_now_requests r, me
  where r.assigned_vendor_id = me.vendor_id
    and me.vendor_id is not null
    and r.status <> 'new'

  order by scheduled_date desc nulls last, created_at desc
  limit 200;
$$;

revoke execute on function public.my_jobs() from public, anon;
grant  execute on function public.my_jobs() to authenticated;

-- ── 3. Tell the customer's phone ────────────────────────────────────────────

-- One secret, minted here, never shown. The trigger sends it; the edge
-- function fetches it through notify_secret() with the service role and
-- compares. Re-running this migration keeps the existing secret.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'notify_customer_secret') then
    perform vault.create_secret(
      encode(gen_random_bytes(24), 'hex'),
      'notify_customer_secret',
      'Shared secret between the notify triggers and the notify-customer edge function'
    );
  end if;
end
$$;

create or replace function public.notify_secret()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'notify_customer_secret' limit 1;
$$;

revoke execute on function public.notify_secret() from public, anon, authenticated;
grant  execute on function public.notify_secret() to service_role;

create or replace function public.notify_customer_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_secret  text;
  v_payload jsonb;
  v_event   text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'notify_customer_secret' limit 1;
  if v_secret is null then
    return new;
  end if;

  if tg_table_name = 'booking_events' then
    v_payload := jsonb_build_object(
      'kind', 'deep',
      'id', new.order_id,
      'event', new.status,
      'note', new.note,
      'event_id', new.id
    );
  else
    -- prime_now_requests: only a status change or going on the way is news.
    if new.status is not distinct from old.status
       and new.en_route_at is not distinct from old.en_route_at then
      return new;
    end if;
    v_event := case
      when new.en_route_at is distinct from old.en_route_at and new.en_route_at is not null then 'en_route'
      else new.status
    end;
    v_payload := jsonb_build_object('kind', 'now', 'id', new.id, 'event', v_event);
  end if;

  perform net.http_post(
    url := 'https://wsdmfleivhzyeqsmojgm.supabase.co/functions/v1/notify-customer',
    body := v_payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke all on function public.notify_customer_event() from public, anon, authenticated;

drop trigger if exists booking_events_notify on public.booking_events;
create trigger booking_events_notify
  after insert on public.booking_events
  for each row execute function public.notify_customer_event();

drop trigger if exists prime_now_notify on public.prime_now_requests;
create trigger prime_now_notify
  after update of status, en_route_at on public.prime_now_requests
  for each row execute function public.notify_customer_event();

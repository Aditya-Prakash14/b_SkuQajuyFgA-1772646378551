-- ============================================================================
-- 0025 — Support for the customer app (apps/customer).
--
-- The app is built on the live schema (customers / orders / services), not a
-- parallel one, so this adds only what genuinely does not exist yet:
--
--   • booking_events    — the tracking timeline. `orders` carries a status but
--                         no history, so a timeline could only ever be guessed
--                         at client-side. Append-only, written by a trigger, so
--                         every existing status change (CRM, partner app, RPC)
--                         is recorded without touching those call sites.
--   • notification_prefs— the three toggles on the onboarding step, plus the
--                         Expo push token for the customer's device.
--   • reviews.tip_amount— the rate screen offers a tip.
--
-- Deliberately NOT added: helper_locations. A live map needs GPS from the
-- partner app, which does not report it; a table with no writer would just be
-- a promise the UI cannot keep. The timeline covers tracking until then.
-- ============================================================================

-- ── Booking timeline ────────────────────────────────────────────────────────

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists booking_events_order_idx
  on public.booking_events (order_id, created_at);

alter table public.booking_events enable row level security;

drop policy if exists "admin manages booking events" on public.booking_events;
create policy "admin manages booking events" on public.booking_events
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer reads own booking events" on public.booking_events;
create policy "customer reads own booking events" on public.booking_events
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = booking_events.order_id
      and o.customer_id = public.current_customer_id()
  ));

drop policy if exists "vendor reads assigned booking events" on public.booking_events;
create policy "vendor reads assigned booking events" on public.booking_events
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = booking_events.order_id
      and o.assigned_vendor_id = public.current_vendor_id()
  ));

-- One writer for the timeline: whatever changes orders.status, the event is
-- recorded. Keeps the timeline a projection of truth rather than a parallel log
-- every call site has to remember to append to.
create or replace function public.record_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into booking_events (order_id, status, note) values (new.id, new.status, 'Booking created');
  elsif new.status is distinct from old.status then
    insert into booking_events (order_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_record_event on public.orders;
create trigger orders_record_event after insert or update of status on public.orders
  for each row execute function public.record_booking_event();

-- Backfill so existing bookings have a timeline instead of an empty screen.
insert into public.booking_events (order_id, status, note, created_at)
select o.id, o.status, 'Recorded at migration', coalesce(o.updated_at, o.created_at, now())
from public.orders o
where not exists (select 1 from public.booking_events e where e.order_id = o.id);

-- ── Notification preferences ────────────────────────────────────────────────

create table if not exists public.notification_prefs (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  booking_updates boolean not null default true,
  helper_en_route boolean not null default true,
  marketing boolean not null default false,
  expo_push_token text,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "admin manages notification prefs" on public.notification_prefs;
create policy "admin manages notification prefs" on public.notification_prefs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer manages own notification prefs" on public.notification_prefs;
create policy "customer manages own notification prefs" on public.notification_prefs
  for all to authenticated
  using (customer_id = public.current_customer_id())
  with check (customer_id = public.current_customer_id());

/** Upsert the caller's own preferences. Null leaves a field unchanged. */
create or replace function public.save_notification_prefs(
  p_booking_updates boolean default null,
  p_helper_en_route boolean default null,
  p_marketing boolean default null,
  p_expo_push_token text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer uuid := current_customer_id();
begin
  if v_customer is null then
    raise exception 'Please sign in first';
  end if;
  insert into notification_prefs (customer_id, booking_updates, helper_en_route, marketing, expo_push_token)
  values (
    v_customer,
    coalesce(p_booking_updates, true),
    coalesce(p_helper_en_route, true),
    coalesce(p_marketing, false),
    nullif(p_expo_push_token, '')
  )
  on conflict (customer_id) do update set
    booking_updates = coalesce(p_booking_updates, notification_prefs.booking_updates),
    helper_en_route = coalesce(p_helper_en_route, notification_prefs.helper_en_route),
    marketing       = coalesce(p_marketing,       notification_prefs.marketing),
    expo_push_token = coalesce(nullif(p_expo_push_token, ''), notification_prefs.expo_push_token),
    updated_at = now();
end;
$$;

revoke execute on function public.save_notification_prefs(boolean, boolean, boolean, text) from public, anon;
grant  execute on function public.save_notification_prefs(boolean, boolean, boolean, text) to authenticated;

-- ── Tip on a rating ─────────────────────────────────────────────────────────

alter table public.reviews
  add column if not exists tip_amount numeric(10, 2) not null default 0;

comment on column public.reviews.tip_amount is
  'Tip left for the helper, in rupees. Settled with the partner payout, not charged online yet.';

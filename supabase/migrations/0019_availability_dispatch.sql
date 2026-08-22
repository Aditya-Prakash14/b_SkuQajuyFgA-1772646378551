-- ============================================================================
-- 0019 — Partner availability and auto-dispatch.
--
-- "Within the hour" cannot rest on a human dispatcher. This adds:
--
--   • vendors.is_online  — the partner's own go-online toggle
--   • job_offers         — a broadcast to several eligible partners at once,
--                          first accept wins, the rest are superseded
--   • dispatch_*()       — build a wave of offers for a job
--   • escalate_offers()  — expire a dead wave and broadcast the next one
--
-- A Prime Now request auto-dispatches the moment it is created, so a customer
-- can be matched without anyone opening the CRM. Manual assignment still works
-- and always wins: dispatch skips jobs that already have a partner.
-- ============================================================================

alter table public.vendors
  add column if not exists is_online boolean not null default false,
  add column if not exists last_online_at timestamptz;

comment on column public.vendors.is_online is
  'Partner-controlled availability. Only online partners receive Prime Now offers.';

create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('deep_clean', 'prime_now')),
  job_id uuid not null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  wave integer not null default 1,
  status text not null default 'offered'
    check (status in ('offered', 'accepted', 'declined', 'expired', 'superseded')),
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  unique (kind, job_id, vendor_id)
);

create index if not exists job_offers_vendor_open_idx
  on public.job_offers (vendor_id, status, expires_at);
create index if not exists job_offers_job_idx on public.job_offers (kind, job_id);

alter table public.job_offers enable row level security;

drop policy if exists "admin manages offers" on public.job_offers;
create policy "admin manages offers" on public.job_offers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "vendor reads own offers" on public.job_offers;
create policy "vendor reads own offers" on public.job_offers
  for select to authenticated
  using (vendor_id = public.current_vendor_id());

-- ── Availability ────────────────────────────────────────────────────────────

create or replace function public.set_my_availability(p_online boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := current_vendor_id();
begin
  if v_id is null then
    raise exception 'No vendor profile for this account';
  end if;
  update vendors
  set is_online = coalesce(p_online, false),
      last_online_at = case when p_online then now() else last_online_at end
  where id = v_id;
end;
$$;

-- ── Dispatch ────────────────────────────────────────────────────────────────

/**
 * Offer a Prime Now request to the next wave of eligible partners.
 * Eligible = active, online, in the request's city, not already offered.
 * Returns how many partners the job went out to.
 */
create or replace function public.dispatch_prime_now(p_request_id uuid, p_wave_size integer default 5)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req prime_now_requests%rowtype;
  v_wave integer;
  v_count integer := 0;
begin
  select * into v_req from prime_now_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  -- Manual assignment wins; never dispatch a job that already has a partner.
  if v_req.assigned_vendor_id is not null or v_req.status <> 'new' then
    return 0;
  end if;

  select coalesce(max(wave), 0) + 1 into v_wave
  from job_offers where kind = 'prime_now' and job_id = p_request_id;

  insert into job_offers (kind, job_id, vendor_id, wave, expires_at)
  select 'prime_now', p_request_id, v.id, v_wave, now() + interval '2 minutes'
  from vendors v
  where v.status = 'active'
    and v.is_online
    and (v_req.city is null or lower(coalesce(v.city, '')) = lower(v_req.city))
    and not exists (
      select 1 from job_offers o
      where o.kind = 'prime_now' and o.job_id = p_request_id and o.vendor_id = v.id
    )
  order by v.rating desc nulls last, v.created_at
  limit greatest(p_wave_size, 1);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

/** Same, for a scheduled order. Availability is not required — the work is not instant. */
create or replace function public.dispatch_order(p_order_id uuid, p_wave_size integer default 5)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order orders%rowtype;
  v_wave integer;
  v_count integer := 0;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.assigned_vendor_id is not null
     or v_order.status not in ('pending', 'confirmed') then
    return 0;
  end if;

  select coalesce(max(wave), 0) + 1 into v_wave
  from job_offers where kind = 'deep_clean' and job_id = p_order_id;

  insert into job_offers (kind, job_id, vendor_id, wave, expires_at)
  select 'deep_clean', p_order_id, v.id, v_wave, now() + interval '30 minutes'
  from vendors v
  where v.status = 'active'
    and lower(coalesce(v.city, '')) = lower(v_order.city)
    and exists (
      select 1 from order_items i
      where i.order_id = p_order_id and i.service_id = any (coalesce(v.services_offered, '{}'))
    )
    and not exists (
      select 1 from job_offers o
      where o.kind = 'deep_clean' and o.job_id = p_order_id and o.vendor_id = v.id
    )
  order by v.rating desc nulls last, v.created_at
  limit greatest(p_wave_size, 1);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- A new Prime Now request goes out immediately, with no human in the loop.
create or replace function public.auto_dispatch_prime_now()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform dispatch_prime_now(new.id);
  return new;
end;
$$;

drop trigger if exists prime_now_auto_dispatch on public.prime_now_requests;
create trigger prime_now_auto_dispatch after insert on public.prime_now_requests
  for each row execute function public.auto_dispatch_prime_now();

-- ── The partner side of an offer ────────────────────────────────────────────

create or replace function public.my_offers()
returns table (
  offer_id uuid,
  kind text,
  job_id uuid,
  reference text,
  expires_at timestamptz,
  city text,
  address text,
  notes text,
  total numeric,
  scheduled_label text,
  summary text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    o.id, o.kind, o.job_id,
    coalesce(r.request_number, ord.order_number) as reference,
    o.expires_at,
    coalesce(r.city, ord.city) as city,
    coalesce(r.address, ord.address) as address,
    coalesce(r.notes, ord.notes) as notes,
    coalesce(r.price, ord.total) as total,
    case
      when o.kind = 'prime_now' then
        case when r.timing = 'now' then 'ASAP — within the hour'
             else to_char(r.scheduled_for at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM') end
      else to_char(ord.scheduled_date, 'DD Mon') || coalesce(' · ' || ord.scheduled_slot, '')
    end as scheduled_label,
    case
      when o.kind = 'prime_now' then 'Prime Now · ' || r.slot_minutes || ' min help'
      else (select string_agg(i.service_name, ', ') from order_items i where i.order_id = ord.id)
    end as summary
  from job_offers o
  left join prime_now_requests r on o.kind = 'prime_now' and r.id = o.job_id
  left join orders ord          on o.kind = 'deep_clean' and ord.id = o.job_id
  where o.vendor_id = current_vendor_id()
    and current_vendor_id() is not null
    and o.status = 'offered'
    and o.expires_at > now()
  order by o.expires_at;
$$;

/** First accept wins. The job row is locked, so a race resolves to one winner. */
create or replace function public.accept_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_vendor uuid := current_vendor_id();
  v_offer job_offers%rowtype;
  v_taken uuid;
begin
  if v_vendor is null then
    raise exception 'No vendor profile for this account';
  end if;

  select * into v_offer from job_offers
  where id = p_offer_id and vendor_id = v_vendor for update;
  if not found then
    raise exception 'This offer is no longer available';
  end if;
  if v_offer.status <> 'offered' then
    raise exception 'You have already responded to this job';
  end if;
  if v_offer.expires_at <= now() then
    update job_offers set status = 'expired', responded_at = now() where id = p_offer_id;
    raise exception 'This offer has expired';
  end if;

  if v_offer.kind = 'prime_now' then
    select assigned_vendor_id into v_taken
    from prime_now_requests where id = v_offer.job_id for update;
    if v_taken is not null then
      update job_offers set status = 'superseded', responded_at = now() where id = p_offer_id;
      raise exception 'Another partner took this job';
    end if;
    update prime_now_requests
    set assigned_vendor_id = v_vendor, status = 'dispatched'
    where id = v_offer.job_id;
  else
    select assigned_vendor_id into v_taken
    from orders where id = v_offer.job_id for update;
    if v_taken is not null then
      update job_offers set status = 'superseded', responded_at = now() where id = p_offer_id;
      raise exception 'Another partner took this job';
    end if;
    update orders
    set assigned_vendor_id = v_vendor, status = 'vendor_assigned'
    where id = v_offer.job_id;
  end if;

  update job_offers set status = 'accepted', responded_at = now() where id = p_offer_id;
  update job_offers set status = 'superseded', responded_at = now()
  where kind = v_offer.kind and job_id = v_offer.job_id and id <> p_offer_id and status = 'offered';

  return jsonb_build_object('job_id', v_offer.job_id, 'kind', v_offer.kind);
end;
$$;

create or replace function public.decline_offer(p_offer_id uuid)
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
  update job_offers
  set status = 'declined', responded_at = now()
  where id = p_offer_id and vendor_id = v_vendor and status = 'offered';
end;
$$;

/**
 * Retire dead waves and broadcast the next one. Safe to run on a timer: it only
 * touches jobs that are still unassigned and whose current wave has expired.
 * Returns the number of jobs re-broadcast.
 */
create or replace function public.escalate_offers()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job record;
  v_sent integer;
  v_jobs integer := 0;
begin
  update job_offers set status = 'expired'
  where status = 'offered' and expires_at <= now();

  for v_job in
    select r.id
    from prime_now_requests r
    where r.status = 'new'
      and r.assigned_vendor_id is null
      and r.created_at > now() - interval '6 hours'
      and not exists (
        select 1 from job_offers o
        where o.kind = 'prime_now' and o.job_id = r.id and o.status = 'offered'
      )
  loop
    v_sent := dispatch_prime_now(v_job.id);
    if v_sent > 0 then
      v_jobs := v_jobs + 1;
    end if;
  end loop;

  return v_jobs;
end;
$$;

revoke execute on function public.set_my_availability(boolean) from public, anon;
revoke execute on function public.my_offers() from public, anon;
revoke execute on function public.accept_offer(uuid) from public, anon;
revoke execute on function public.decline_offer(uuid) from public, anon;
revoke execute on function public.dispatch_prime_now(uuid, integer) from public, anon;
revoke execute on function public.dispatch_order(uuid, integer) from public, anon;
revoke execute on function public.escalate_offers() from public, anon;

grant execute on function public.set_my_availability(boolean) to authenticated;
grant execute on function public.my_offers() to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.decline_offer(uuid) to authenticated;
grant execute on function public.dispatch_prime_now(uuid, integer) to authenticated;
grant execute on function public.dispatch_order(uuid, integer) to authenticated;

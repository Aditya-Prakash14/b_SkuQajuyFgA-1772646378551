-- ============================================================================
-- 0022 — Partners choose which kind of work they want.
--
-- The two domains are different jobs: Deep Cleaning is scheduled, priced work a
-- crew plans for; Prime Now is instant hourly house help. A marble-polishing
-- contractor should not be woken up for 30 minutes of dishes, and someone who
-- only wants hourly work should not be offered a 4 BHK deep clean.
--
-- Both default to true so existing partners keep receiving everything they
-- already received; the partner opts out from their profile.
--
-- `services_offered` still says *which* Deep Cleaning services — this is the
-- coarser question of which business the partner is in at all.
-- ============================================================================

alter table public.vendors
  add column if not exists accepts_deep_clean boolean not null default true,
  add column if not exists accepts_prime_now boolean not null default true;

comment on column public.vendors.accepts_deep_clean is
  'Partner wants scheduled Deep Cleaning jobs (see services_offered for which).';
comment on column public.vendors.accepts_prime_now is
  'Partner wants instant Prime Now hourly work. Also requires is_online at dispatch time.';

-- New optional params keep every existing 5-argument call working.
create or replace function public.upsert_my_vendor_profile(
  p_name text,
  p_email text,
  p_city text,
  p_services uuid[],
  p_note text default null,
  p_accepts_deep_clean boolean default null,
  p_accepts_prime_now boolean default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_id uuid := current_vendor_id();
begin
  if v_id is null then raise exception 'No vendor profile for this account'; end if;

  -- A partner has to be in at least one of the two businesses.
  if coalesce(p_accepts_deep_clean, true) = false
     and coalesce(p_accepts_prime_now, true) = false then
    raise exception 'Choose at least one kind of work: Deep Cleaning or Prime Now';
  end if;

  update vendors set
    name = coalesce(nullif(trim(p_name),''), name),
    email = coalesce(nullif(trim(p_email),''), email),
    city = coalesce(nullif(trim(p_city),''), city),
    services_offered = coalesce(p_services, services_offered),
    application_note = coalesce(nullif(trim(p_note),''), application_note),
    accepts_deep_clean = coalesce(p_accepts_deep_clean, accepts_deep_clean),
    accepts_prime_now  = coalesce(p_accepts_prime_now,  accepts_prime_now),
    onboarding_step = case when onboarding_step = 'profile' then 'documents' else onboarding_step end
  where id = v_id;
end;
$function$;

-- Dispatch has to respect the choice, or the preference is decoration.
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
    and v.accepts_prime_now
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
    and v.accepts_deep_clean
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

revoke execute on function public.upsert_my_vendor_profile(text, text, text, uuid[], text, boolean, boolean) from public, anon;
grant  execute on function public.upsert_my_vendor_profile(text, text, text, uuid[], text, boolean, boolean) to authenticated;

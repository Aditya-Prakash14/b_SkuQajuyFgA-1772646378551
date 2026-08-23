-- ============================================================================
-- 0029 — Customer app, Phase 1 (docs/customer-app-master-prompt.md §4, §5).
--
-- Everything the app needs from the database before any new outside service
-- is involved:
--
--   1. reschedule_booking() records itself on the timeline. The orders trigger
--      fires on a status change only, so a reschedule left no trace.
--   2. my_booking_helper(): the one thing a customer may learn about the
--      partner on their job — name and rating, plus a phone number while the
--      job is live. Deliberately an RPC: a vendors SELECT policy would expose
--      commission_rate, expo_push_token and documents.
--   3. reviews: "public reads reviews" using (true) let anyone read every
--      customer_id, order_id and tip_amount. Anonymous readers now see only the
--      display columns; signed-in customers see their own rows; public_reviews
--      is the safe read for service pages.
--   4. create_booking(): p_source so app bookings are distinguishable from the
--      website's, and a qty cap (the CRM already caps at 20).
--   5. prime_now_requests.source + the same parameter on the intake RPC.
--   6. save_notification_prefs(): a token can now be cleared on sign-out and
--      is validated like register_push_token().
--   7. customers: a customer may update name / email / city directly, never
--      phone or auth_user_id — those go through upsert_my_profile(), which
--      carries the phone-collision rule.
--   8. dispatch_prime_now() / dispatch_order() were executable by any signed-in
--      user with no admin check — a customer could broadcast offer waves.
--      Only ops, the intake trigger and the cron may call them now.
--   9. my_stats(): tips are part of the payout, as the rate screen promises.
--
-- Signature changes (4, 5, 9) drop first, then create — see 0023 / 0026.
-- ============================================================================

-- ── 1. Reschedule leaves a timeline entry ───────────────────────────────────

create or replace function public.reschedule_booking(p_order_id uuid, p_date date, p_slot text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cust   uuid := current_customer_id();
  v_status text;
  v_slot   text;
begin
  if v_cust is null then raise exception 'Please sign in'; end if;
  if p_date < current_date then raise exception 'Pick a future date'; end if;

  update orders
     set scheduled_date = p_date,
         scheduled_slot = coalesce(nullif(trim(p_slot), ''), scheduled_slot)
   where id = p_order_id and customer_id = v_cust and status in ('pending', 'confirmed')
   returning status, scheduled_slot into v_status, v_slot;

  if not found then
    raise exception 'This booking can no longer be rescheduled';
  end if;

  insert into booking_events (order_id, status, note)
  values (p_order_id, v_status,
          'Rescheduled to ' || to_char(p_date, 'FMDD Mon') || coalesce(' · ' || v_slot, ''));
end;
$$;

-- ── 2. Who is coming ────────────────────────────────────────────────────────

create or replace function public.my_booking_helper(p_kind text, p_id uuid)
returns table (name text, rating numeric, rating_count integer, phone text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with job as (
    select o.assigned_vendor_id as vendor_id,
           o.status in ('vendor_assigned', 'in_progress') as live
    from orders o
    where p_kind = 'deep' and o.id = p_id and o.customer_id = current_customer_id()
    union all
    select r.assigned_vendor_id,
           r.status in ('dispatched', 'in_progress')
    from prime_now_requests r
    where p_kind = 'now' and r.id = p_id and r.customer_id = current_customer_id()
  ),
  rv as (
    select round(avg(r.rating)::numeric, 1) as avg, count(*)::int as n
    from reviews r
    join orders o on o.id = r.order_id
    join job on job.vendor_id = o.assigned_vendor_id
  )
  select v.name,
         rv.avg,
         rv.n,
         case when job.live then v.phone end
  from job
  join vendors v on v.id = job.vendor_id
  cross join rv
  where current_customer_id() is not null;
$$;

revoke execute on function public.my_booking_helper(text, uuid) from public, anon;
grant  execute on function public.my_booking_helper(text, uuid) to authenticated;

-- ── 3. Reviews: display columns for the world, own rows for a customer ──────

drop policy if exists "public reads reviews" on public.reviews;

create policy "anon reads review display columns" on public.reviews
  for select to anon using (true);

create policy "customer reads own reviews" on public.reviews
  for select to authenticated
  using (customer_id = current_customer_id() or is_admin());

revoke select on public.reviews from anon;
grant  select (id, service_id, rating, comment, created_at) on public.reviews to anon;

-- The safe public read. Owned by postgres, so it is not subject to the table's
-- RLS, and it exposes nothing that identifies the reviewer beyond a first name.
create or replace view public.public_reviews as
  select r.id,
         r.service_id,
         r.rating,
         r.comment,
         r.created_at,
         split_part(coalesce(c.name, ''), ' ', 1) as reviewer
  from public.reviews r
  left join public.customers c on c.id = r.customer_id
  where r.comment is not null;

grant select on public.public_reviews to anon, authenticated;

-- ── 4. create_booking: source + qty cap ─────────────────────────────────────

drop function if exists public.create_booking(text, text, text, text, text, date, jsonb, text, text);

create function public.create_booking(
  p_name text,
  p_phone text,
  p_email text,
  p_city text,
  p_address text,
  p_scheduled_date date,
  p_items jsonb,
  p_notes text default null,
  p_slot text default null,
  p_source text default 'website'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  v_units       numeric(10,2);
  v_line_total  numeric(10,2);
  v_name        text := trim(p_name);
  v_phone       text := trim(p_phone);
  v_email       text := nullif(trim(p_email), '');
  v_address     text := trim(p_address);
  v_source      text := case when p_source in ('website', 'app', 'crm', 'phone') then p_source else 'website' end;
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

  select id into v_customer_id from customers where auth_user_id = v_uid limit 1;

  if v_customer_id is not null then
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
    if exists (
      select 1 from customers
      where phone = v_phone and auth_user_id is not null and auth_user_id <> v_uid
    ) then
      raise exception 'This phone number is already linked to a different account';
    end if;
    update customers set
      auth_user_id = v_uid, name = v_name,
      email = coalesce(v_email, email), city = coalesce(p_city, city)
    where phone = v_phone and auth_user_id is null
    returning id into v_customer_id;
    if v_customer_id is null then
      insert into customers (name, phone, email, city, auth_user_id)
      values (v_name, v_phone, v_email, p_city, v_uid)
      returning id into v_customer_id;
    end if;
  end if;

  insert into orders (customer_id, status, scheduled_date, scheduled_slot, city, address,
                      subtotal, tax, total, source, notes)
  values (v_customer_id, 'pending', p_scheduled_date, nullif(trim(p_slot), ''), p_city, v_address,
          0, 0, 0, v_source, nullif(trim(p_notes), ''))
  returning id, order_number into v_order_id, v_order_no;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);
    if v_qty > 20 then
      raise exception 'You can book up to 20 of a service at once — please call us for a larger job';
    end if;
    select * into v_service from services
      where id = (v_item->>'service_id')::uuid and is_active = true;
    if not found then
      raise exception 'Service % is not available', v_item->>'service_id';
    end if;

    if v_service.price_unit = 'fixed' then
      v_units := 1;
    else
      v_units := (v_item->>'units')::numeric;
      if v_units is null or v_units <= 0 then
        raise exception '% is priced per unit — please tell us the area or quantity', v_service.name;
      end if;
      if v_units > 100000 then
        raise exception 'That area looks too large — please call us for a site visit';
      end if;
    end if;

    v_line_total := round(v_service.price * v_units * v_qty, 2);
    v_gross := v_gross + v_line_total;
    insert into order_items (order_id, service_id, service_name, unit_price, qty, units, line_total)
    values (v_order_id, v_service.id, v_service.name, v_service.price, v_qty, v_units, v_line_total);
  end loop;

  v_total   := round(v_gross, 2);
  v_taxable := round(v_total / 1.18, 2);
  v_tax     := v_total - v_taxable;
  update orders set subtotal = v_taxable, tax = v_tax, total = v_total where id = v_order_id;

  if v_address <> '' and not exists (
    select 1 from addresses where customer_id = v_customer_id and full_address = v_address
  ) then
    insert into addresses (customer_id, label, full_address, city, is_default)
    values (
      v_customer_id, 'Home', v_address, p_city,
      not exists (select 1 from addresses where customer_id = v_customer_id)
    );
  end if;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_no);
end;
$$;

revoke execute on function public.create_booking(text, text, text, text, text, date, jsonb, text, text, text) from public;
grant  execute on function public.create_booking(text, text, text, text, text, date, jsonb, text, text, text) to anon, authenticated;

-- ── 5. Prime Now: source ────────────────────────────────────────────────────

alter table public.prime_now_requests
  add column if not exists source text not null default 'website'
    check (source in ('website', 'app', 'crm', 'phone'));

drop function if exists public.create_prime_now_request(text, text, text, text, text, text[], text, text, timestamptz);

create function public.create_prime_now_request(
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

  select m, p into v_minutes, v_price
  from (values ('30m', 30, 199.00), ('1h', 60, 349.00), ('90m', 90, 499.00), ('half_day', 240, 1199.00))
       as t(s, m, p)
  where t.s = p_slot;
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

-- ── 6. Notification prefs: clearable, validated token ───────────────────────

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
  v_token    text := p_expo_push_token;
begin
  if v_customer is null then
    raise exception 'Please sign in first';
  end if;
  -- null = leave alone; '' = clear; anything else must look like an Expo token.
  if v_token is not null and v_token <> '' and v_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'That does not look like an Expo push token';
  end if;

  insert into notification_prefs (customer_id, booking_updates, helper_en_route, marketing, expo_push_token)
  values (
    v_customer,
    coalesce(p_booking_updates, true),
    coalesce(p_helper_en_route, true),
    coalesce(p_marketing, false),
    nullif(v_token, '')
  )
  on conflict (customer_id) do update set
    booking_updates = coalesce(p_booking_updates, notification_prefs.booking_updates),
    helper_en_route = coalesce(p_helper_en_route, notification_prefs.helper_en_route),
    marketing       = coalesce(p_marketing,       notification_prefs.marketing),
    expo_push_token = case
                        when v_token is null then notification_prefs.expo_push_token
                        when v_token = ''    then null
                        else v_token
                      end,
    updated_at = now();
end;
$$;

-- ── 7. Customers: direct updates limited to the harmless columns ────────────

revoke update on public.customers from authenticated;
grant  update (name, email, city) on public.customers to authenticated;

-- ── 8. Only ops and the system may broadcast offers ─────────────────────────

-- The intake trigger and the cron run dispatch on behalf of the system. The
-- trigger runs inside the customer's own request, so auth.uid() is set; it
-- marks the transaction instead. set_config is not reachable through PostgREST,
-- so a client cannot forge the mark.
create or replace function public.auto_dispatch_prime_now()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.internal_dispatch', '1', true);
  perform dispatch_prime_now(new.id);
  return new;
end;
$$;

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
  if current_setting('app.internal_dispatch', true) is distinct from '1'
     and auth.uid() is not null and not is_admin() then
    raise exception 'Not allowed';
  end if;

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
  if current_setting('app.internal_dispatch', true) is distinct from '1'
     and auth.uid() is not null and not is_admin() then
    raise exception 'Not allowed';
  end if;

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

-- ── 9. Tips are part of the payout ──────────────────────────────────────────

drop function if exists public.my_stats();

create function public.my_stats()
returns table (
  commission_rate numeric,
  completed_count integer,
  month_jobs integer,
  month_gross numeric,
  month_payout numeric,
  all_time_payout numeric,
  rating_avg numeric,
  rating_count integer,
  month_tips numeric,
  all_time_tips numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with v as (
    select id, coalesce(commission_rate, 0) as rate
    from vendors
    where id = current_vendor_id()
  ),
  done as (
    select o.subtotal, o.total, o.updated_at
    from orders o, v
    where o.assigned_vendor_id = v.id and o.status = 'completed'
  ),
  month as (
    select * from done
    where (updated_at at time zone 'Asia/Kolkata') >= date_trunc('month', now() at time zone 'Asia/Kolkata')
  ),
  rv as (
    select r.rating, r.tip_amount, r.created_at
    from reviews r
    join orders o on o.id = r.order_id, v
    where o.assigned_vendor_id = v.id
  ),
  month_rv as (
    select * from rv
    where (created_at at time zone 'Asia/Kolkata') >= date_trunc('month', now() at time zone 'Asia/Kolkata')
  )
  select
    (select rate from v)                                                        as commission_rate,
    (select count(*)::int from done)                                            as completed_count,
    (select count(*)::int from month)                                           as month_jobs,
    coalesce((select sum(total) from month), 0)                                 as month_gross,
    coalesce((select round(sum(subtotal * (1 - rate / 100.0)), 2) from month, v), 0)
      + coalesce((select sum(tip_amount) from month_rv), 0)                     as month_payout,
    coalesce((select round(sum(subtotal * (1 - rate / 100.0)), 2) from done, v), 0)
      + coalesce((select sum(tip_amount) from rv), 0)                           as all_time_payout,
    (select round(avg(rating)::numeric, 1) from rv)                             as rating_avg,
    (select count(*)::int from rv)                                              as rating_count,
    coalesce((select sum(tip_amount) from month_rv), 0)                         as month_tips,
    coalesce((select sum(tip_amount) from rv), 0)                               as all_time_tips
  where exists (select 1 from v);
$$;

revoke execute on function public.my_stats() from public, anon;
grant  execute on function public.my_stats() to authenticated;

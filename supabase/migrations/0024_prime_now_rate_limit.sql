-- ============================================================================
-- 0024 — Rate-limit Prime Now intake.
--
-- create_prime_now_request() is anon-callable by design: the form asks for a
-- phone and an address, not a login. But it is now on a public domain, it has
-- no CAPTCHA, and since 0019 every call fires the auto-dispatch trigger. So one
-- scripted loop could flood the ops queue AND push a junk offer at every online
-- partner in a city — the cost lands on real people's phones, not just a table.
--
-- Two limits, both per phone number, both worded for a human who hit them by
-- accident rather than for the bot:
--   • at most 3 requests in a rolling hour
--   • at most 2 open (unfinished) requests at a time
--
-- Deliberately generous: booking twice in an hour for two addresses still works.
-- ============================================================================

create index if not exists prime_now_requests_phone_recent_idx
  on public.prime_now_requests (phone, created_at desc);

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
  v_recent integer;
  v_open integer;
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

  -- Abuse guard. Checked before the insert so the dispatch trigger never runs.
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

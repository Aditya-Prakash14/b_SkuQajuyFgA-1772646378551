-- ============================================================================
-- 0018 — Prime Now jobs reach the partner's phone.
--
-- my_jobs() read only `orders`, so a Prime Now request could be dispatched in
-- the CRM and the assigned helper would never see it: the business could take
-- an order it had no way to deliver.
--
-- my_jobs() now returns both, discriminated by `kind`. Prime Now statuses are
-- mapped onto the order vocabulary the app already understands
-- (dispatched → vendor_assigned), so the partner app's state machine is
-- unchanged. update_my_job_status() keeps its signature and routes on which
-- table owns the id.
-- ============================================================================

alter table public.prime_now_requests
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists payment_method text;

-- Return type changes, so the old function has to go first.
drop function if exists public.my_jobs();

create or replace function public.my_jobs()
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
  updated_at timestamptz
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
    o.created_at, o.updated_at
  from orders o
  join customers c on c.id = o.customer_id, me
  where o.assigned_vendor_id = me.vendor_id and me.vendor_id is not null

  union all

  select
    'prime_now'::text as kind,
    r.id, r.request_number,
    -- Map onto the order vocabulary so the app needs no new states.
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
    r.created_at, r.updated_at
  from prime_now_requests r, me
  where r.assigned_vendor_id = me.vendor_id
    and me.vendor_id is not null
    -- 'new' means nobody is assigned yet; it is never a partner's job.
    and r.status <> 'new'

  order by scheduled_date desc nulls last, created_at desc
  limit 200;
$$;

create or replace function public.update_my_job_status(
  p_order_id uuid,
  p_status text,
  p_cash_collected boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_vendor uuid := current_vendor_id();
  v_vendor_status text;
  v_cur text;
  v_is_prime boolean := false;
begin
  if v_vendor is null then
    raise exception 'No vendor profile for this account';
  end if;

  select status into v_vendor_status from vendors where id = v_vendor;
  if v_vendor_status not in ('active', 'approved') then
    raise exception 'Your partner account is not active';
  end if;

  select status into v_cur
  from orders
  where id = p_order_id and assigned_vendor_id = v_vendor
  for update;

  if v_cur is null then
    select case status when 'dispatched' then 'vendor_assigned' else status end
      into v_cur
    from prime_now_requests
    where id = p_order_id and assigned_vendor_id = v_vendor
    for update;
    v_is_prime := v_cur is not null;
  end if;

  if v_cur is null then
    raise exception 'This job is not assigned to you';
  end if;

  if not (
    (v_cur = 'vendor_assigned' and p_status = 'in_progress') or
    (v_cur = 'in_progress'     and p_status = 'completed')
  ) then
    raise exception 'Cannot move a job from % to %', v_cur, p_status;
  end if;

  if v_is_prime then
    update prime_now_requests
    set status = p_status,
        payment_status = case
          when p_status = 'completed' and p_cash_collected and payment_status = 'unpaid'
          then 'paid' else payment_status end,
        payment_method = case
          when p_status = 'completed' and p_cash_collected and payment_status = 'unpaid'
          then 'cash' else payment_method end
    where id = p_order_id;
  else
    update orders
    set status = p_status,
        payment_status = case
          when p_status = 'completed' and p_cash_collected and payment_status = 'unpaid'
          then 'paid' else payment_status end,
        payment_method = case
          when p_status = 'completed' and p_cash_collected and payment_status = 'unpaid'
          then 'cash' else payment_method end
    where id = p_order_id;
  end if;
end;
$$;

revoke execute on function public.my_jobs() from public, anon;
grant  execute on function public.my_jobs() to authenticated;
revoke execute on function public.update_my_job_status(uuid, text, boolean) from public, anon;
grant  execute on function public.update_my_job_status(uuid, text, boolean) to authenticated;

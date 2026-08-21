-- ============================================================================
-- 0010 — Vendor jobs: what an onboarded partner sees and can do after approval.
--
-- Until now vendors had no read path to orders at all (policy matrix §4.1).
-- This adds the narrowest possible contract:
--   • my_jobs()                 — the orders assigned to the calling vendor,
--                                 with the customer's name/phone and line items,
--                                 in one round trip. SECURITY DEFINER so the
--                                 customers table stays closed to vendors.
--   • update_my_job_status()    — the only write: vendor_assigned → in_progress
--                                 → completed, on their own jobs only. Optionally
--                                 records cash collected at completion.
--   • RLS SELECT on orders/order_items for the assigned vendor — not used by the
--                                 app today (it goes through my_jobs) but makes
--                                 Realtime possible later without a policy change.
-- Assignment itself stays a CRM action (assignVendor → status 'vendor_assigned').
-- ============================================================================

-- Vendor may read the orders assigned to them (and their items).
drop policy if exists "vendor reads assigned orders" on public.orders;
create policy "vendor reads assigned orders" on public.orders
  for select using (assigned_vendor_id = public.current_vendor_id());

drop policy if exists "vendor reads assigned order items" on public.order_items;
create policy "vendor reads assigned order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.assigned_vendor_id = public.current_vendor_id()
    )
  );

-- The job feed. Newest scheduled first; capped so the payload stays bounded.
create or replace function public.my_jobs()
returns table (
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
  select
    o.id, o.order_number, o.status, o.scheduled_date, o.scheduled_slot,
    o.city, o.address, o.notes, o.total, o.payment_status, o.payment_method,
    c.name  as customer_name,
    c.phone as customer_phone,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'service_name', i.service_name,
               'qty', i.qty,
               'unit_price', i.unit_price,
               'line_total', i.line_total)
             order by i.service_name)
      from order_items i where i.order_id = o.id
    ), '[]'::jsonb) as items,
    o.created_at, o.updated_at
  from orders o
  join customers c on c.id = o.customer_id
  where o.assigned_vendor_id = current_vendor_id()
    and current_vendor_id() is not null
  order by o.scheduled_date desc nulls last, o.created_at desc
  limit 200;
$$;

-- The only vendor write on orders. Strict forward-only transitions.
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
    raise exception 'This job is not assigned to you';
  end if;

  if not (
    (v_cur = 'vendor_assigned' and p_status = 'in_progress') or
    (v_cur = 'in_progress'     and p_status = 'completed')
  ) then
    raise exception 'Cannot move a job from % to %', v_cur, p_status;
  end if;

  update orders
  set status = p_status,
      payment_status = case
        when p_status = 'completed' and p_cash_collected and payment_status = 'unpaid'
        then 'paid' else payment_status end,
      payment_method = case
        when p_status = 'completed' and p_cash_collected and payment_status = 'unpaid'
        then 'cash' else payment_method end
  where id = p_order_id;
end;
$$;

-- Signed-in vendors only; never anon.
revoke execute on function public.my_jobs() from public, anon;
revoke execute on function public.update_my_job_status(uuid, text, boolean) from public, anon;
grant  execute on function public.my_jobs() to authenticated;
grant  execute on function public.update_my_job_status(uuid, text, boolean) to authenticated;

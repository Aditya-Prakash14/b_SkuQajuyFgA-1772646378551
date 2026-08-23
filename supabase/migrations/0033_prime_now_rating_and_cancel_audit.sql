-- ============================================================================
-- 0033 — Prime Now rating (spec §5.6, §11 default "yes") and the cancellation
--        audit for cancels that do not come through the customer RPCs.
--
--   1. reviews.request_id: a review can belong to a Prime Now request instead
--      of an order line. submit_request_review() mirrors submit_review():
--      own request, completed, 1–5, tip ≤ ₹5,000, one per request. Request
--      reviews have no service, so the service-rating trigger ignores them
--      (its UPDATE … WHERE s.id = NULL matches nothing) and public_reviews
--      (service pages) never shows them.
--   2. my_stats() and my_booking_helper() count request reviews and tips too,
--      so a partner who works Prime Now only is no longer rated "new".
--   3. cancelled_at / cancelled_by are stamped by a trigger whenever status
--      becomes 'cancelled' without the RPCs having set them — the CRM's
--      status dropdown is a bare UPDATE, so it is recorded as 'ops'.
-- ============================================================================

-- ── 1. Reviews for Prime Now requests ───────────────────────────────────────

alter table public.reviews
  add column if not exists request_id uuid references public.prime_now_requests(id) on delete cascade;

create unique index if not exists reviews_one_per_request
  on public.reviews (request_id) where request_id is not null;

create or replace function public.submit_request_review(
  p_request_id uuid,
  p_rating integer,
  p_comment text default null,
  p_tip_amount numeric default 0
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_cust uuid := current_customer_id();
begin
  if v_cust is null then raise exception 'Please sign in'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1-5'; end if;
  if coalesce(p_tip_amount, 0) < 0 or coalesce(p_tip_amount, 0) > 5000 then
    raise exception 'Tip must be between ₹0 and ₹5,000';
  end if;
  if not exists (
    select 1 from prime_now_requests r
    where r.id = p_request_id and r.customer_id = v_cust and r.status = 'completed'
  ) then
    raise exception 'You can only review a completed request of your own';
  end if;

  insert into reviews (request_id, customer_id, rating, comment, tip_amount)
  values (p_request_id, v_cust, p_rating, nullif(trim(p_comment), ''), coalesce(p_tip_amount, 0))
  on conflict (request_id) where request_id is not null do update
    set rating = excluded.rating,
        comment = excluded.comment,
        tip_amount = excluded.tip_amount,
        created_at = now();
end;
$$;

revoke execute on function public.submit_request_review(uuid, integer, text, numeric) from public, anon;
grant  execute on function public.submit_request_review(uuid, integer, text, numeric) to authenticated;

-- ── 2. Ratings and tips from both domains ───────────────────────────────────

create or replace function public.my_stats()
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
    union all
    select r.rating, r.tip_amount, r.created_at
    from reviews r
    join prime_now_requests q on q.id = r.request_id, v
    where q.assigned_vendor_id = v.id
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
  ratings as (
    select r.rating
    from reviews r
    join orders o on o.id = r.order_id
    join job on job.vendor_id = o.assigned_vendor_id
    union all
    select r.rating
    from reviews r
    join prime_now_requests q on q.id = r.request_id
    join job on job.vendor_id = q.assigned_vendor_id
  ),
  rv as (
    select round(avg(rating)::numeric, 1) as avg, count(*)::int as n from ratings
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

-- ── 3. Every cancel is attributed ───────────────────────────────────────────

create or replace function public.record_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
    if new.cancelled_by is null then
      new.cancelled_by := case when is_admin() then 'ops' else 'system' end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_record_cancellation on public.orders;
create trigger orders_record_cancellation
  before update of status on public.orders
  for each row execute function public.record_cancellation();

drop trigger if exists prime_now_record_cancellation on public.prime_now_requests;
create trigger prime_now_record_cancellation
  before update of status on public.prime_now_requests
  for each row execute function public.record_cancellation();

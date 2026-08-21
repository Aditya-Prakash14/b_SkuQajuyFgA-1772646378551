-- ============================================================================
-- 0013 — my_stats(): earnings and rating for the signed-in partner.
--
-- Money model (documented assumption — change here if finance disagrees):
--   • orders.subtotal is the service value before GST; orders.total is what the
--     customer pays (GST-inclusive).
--   • vendors.commission_rate is the platform's cut, in percent, of the
--     service value. Payout to the partner = subtotal × (1 − rate/100).
--   GST is pass-through and never part of the payout.
-- Rating = average of customer reviews on orders this vendor completed.
-- One round trip, vendor-scoped, SECURITY DEFINER (reviews/customers stay
-- closed to vendors). "This month" is the calendar month in Asia/Kolkata.
-- ============================================================================

create or replace function public.my_stats()
returns table (
  commission_rate numeric,
  completed_count integer,
  month_jobs integer,
  month_gross numeric,
  month_payout numeric,
  all_time_payout numeric,
  rating_avg numeric,
  rating_count integer
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
    select r.rating
    from reviews r
    join orders o on o.id = r.order_id, v
    where o.assigned_vendor_id = v.id
  )
  select
    (select rate from v)                                                        as commission_rate,
    (select count(*)::int from done)                                            as completed_count,
    (select count(*)::int from month)                                           as month_jobs,
    coalesce((select sum(total) from month), 0)                                 as month_gross,
    coalesce((select round(sum(subtotal * (1 - rate / 100.0)), 2) from month, v), 0) as month_payout,
    coalesce((select round(sum(subtotal * (1 - rate / 100.0)), 2) from done, v), 0)  as all_time_payout,
    (select round(avg(rating)::numeric, 1) from rv)                             as rating_avg,
    (select count(*)::int from rv)                                              as rating_count
  where exists (select 1 from v);
$$;

revoke execute on function public.my_stats() from public, anon;
grant  execute on function public.my_stats() to authenticated;

-- ============================================================================
-- 0026 — Let a customer leave a tip with a rating.
--
-- submit_review gains p_tip_amount. Adding a defaulted parameter with
-- `create or replace` would create a SECOND overload rather than replacing the
-- function — exactly what happened to upsert_my_vendor_profile in 0022 and
-- broke every 4-argument call with PGRST203. So drop first, then create.
--
-- The 4-argument call shape still works, because the new parameter defaults.
-- ============================================================================

drop function if exists public.submit_review(uuid, uuid, integer, text);

create function public.submit_review(
  p_order_id uuid,
  p_service_id uuid,
  p_rating integer,
  p_comment text default null,
  p_tip_amount numeric default 0
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_cust uuid := current_customer_id();
begin
  if v_cust is null then raise exception 'Please sign in'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1-5'; end if;
  if coalesce(p_tip_amount, 0) < 0 or coalesce(p_tip_amount, 0) > 5000 then
    raise exception 'Tip must be between ₹0 and ₹5,000';
  end if;
  if not exists (
    select 1 from orders o
    where o.id = p_order_id and o.customer_id = v_cust and o.status = 'completed'
  ) then
    raise exception 'You can only review a completed booking of your own';
  end if;
  if not exists (
    select 1 from order_items oi where oi.order_id = p_order_id and oi.service_id = p_service_id
  ) then
    raise exception 'That service was not part of this booking';
  end if;

  insert into reviews (order_id, service_id, customer_id, rating, comment, tip_amount)
  values (p_order_id, p_service_id, v_cust, p_rating, nullif(trim(p_comment), ''), coalesce(p_tip_amount, 0))
  on conflict (order_id, service_id) do update
    set rating = excluded.rating,
        comment = excluded.comment,
        tip_amount = excluded.tip_amount,
        created_at = now();
end;
$function$;

revoke execute on function public.submit_review(uuid, uuid, integer, text, numeric) from public, anon;
grant  execute on function public.submit_review(uuid, uuid, integer, text, numeric) to authenticated;

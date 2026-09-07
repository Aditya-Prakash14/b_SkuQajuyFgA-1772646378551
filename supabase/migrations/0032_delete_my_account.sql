-- ============================================================================
-- 0032 — Account deletion (docs/customer-app-master-prompt.md Phase 4).
--
-- Required by both stores. The customer's identity is removed; the accounting
-- record is not: orders and requests keep their amounts and service address,
-- reviews stay (shown as "Deleted"), and nothing that the partner or the CRM
-- already acted on disappears from their history.
--
-- Two steps, because only the user's own session can resolve auth.uid():
--   1. delete_my_account()      — called with the user's JWT; anonymises.
--   2. the delete-account edge function deletes the auth user with the
--      service role and is what the app actually calls; it runs step 1 first.
-- ============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_cust uuid;
begin
  if v_uid is null then
    raise exception 'Please sign in';
  end if;

  select id into v_cust from customers where auth_user_id = v_uid limit 1;
  if v_cust is null then
    return;
  end if;

  delete from addresses where customer_id = v_cust;
  delete from notification_prefs where customer_id = v_cust;

  -- Prime Now requests carry the contact details inline.
  update prime_now_requests
     set name = 'Deleted customer',
         phone = 'deleted:' || left(v_cust::text, 8)
   where customer_id = v_cust;

  -- customers.phone is NOT NULL + UNIQUE; a per-account sentinel keeps both.
  update customers
     set name = 'Deleted customer',
         phone = 'deleted:' || v_uid::text,
         email = null,
         city = null,
         auth_user_id = null
   where id = v_cust;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;

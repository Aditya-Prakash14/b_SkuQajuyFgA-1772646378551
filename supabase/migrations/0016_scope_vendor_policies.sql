-- ============================================================================
-- 0016 — Scope vendor/customer RLS policies to signed-in roles.
--
-- Fixes a regression from 0010. Those policies call current_vendor_id(), whose
-- EXECUTE is (deliberately) revoked from anon. Postgres still evaluates every
-- policy on the table for an anon request, so an anon SELECT on orders raised
--
--     42501  permission denied for function current_vendor_id
--
-- instead of returning an empty set. No data was ever exposed — but a hard
-- error is the wrong failure mode: callers that legitimately expect "no rows"
-- got an exception, and the error leaks the function name.
--
-- `TO authenticated` stops the policy being considered for anon at all, so anon
-- falls through to the remaining policies and simply sees nothing.
-- ============================================================================

drop policy if exists "vendor reads assigned orders" on public.orders;
create policy "vendor reads assigned orders" on public.orders
  for select to authenticated
  using (assigned_vendor_id = public.current_vendor_id());

drop policy if exists "vendor reads assigned order items" on public.order_items;
create policy "vendor reads assigned order items" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.assigned_vendor_id = public.current_vendor_id()
    )
  );

drop policy if exists "vendor reads assigned prime now" on public.prime_now_requests;
create policy "vendor reads assigned prime now" on public.prime_now_requests
  for select to authenticated
  using (assigned_vendor_id = public.current_vendor_id());

drop policy if exists "customer reads own prime now" on public.prime_now_requests;
create policy "customer reads own prime now" on public.prime_now_requests
  for select to authenticated
  using (customer_id is not null and customer_id = public.current_customer_id());

-- vendor_documents policies call current_vendor_id() too (0008/0011).
drop policy if exists "vendor reads own docs" on public.vendor_documents;
create policy "vendor reads own docs" on public.vendor_documents
  for select to authenticated
  using (vendor_id = public.current_vendor_id());

drop policy if exists "vendor adds own pending docs" on public.vendor_documents;
create policy "vendor adds own pending docs" on public.vendor_documents
  for insert to authenticated
  with check (vendor_id = public.current_vendor_id() and status = 'pending');

drop policy if exists "vendor deletes own pending docs" on public.vendor_documents;
create policy "vendor deletes own pending docs" on public.vendor_documents
  for delete to authenticated
  using (vendor_id = public.current_vendor_id() and status in ('pending', 'rejected'));

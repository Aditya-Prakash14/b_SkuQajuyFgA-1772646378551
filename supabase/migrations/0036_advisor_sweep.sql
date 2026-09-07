-- 0036: Supabase advisor sweep (security + performance lints, 7 Sep 2026).
--
-- Fixes the actionable findings:
--   - touch_prime_now_slots (0034) had a mutable search_path.
--   - Four foreign keys had no covering index.
--   - Two tables carried byte-identical duplicate indexes.
--   - Four hot RLS policies re-evaluated auth.uid() per row; wrapping it in
--     a scalar subquery lets the planner evaluate it once (auth_rls_initplan).
--
-- Noted, deliberately NOT changed:
--   - public_reviews stays a SECURITY DEFINER view: it exists to expose a
--     curated column subset of reviews to anon (0029), which is the point.
--   - The 48 "security definer function executable" warnings are the
--     project's architecture (spec §0.4): every RPC self-scopes via
--     current_customer_id()/is_admin() internally.
--   - pg_net stays in public: relocating it breaks nothing today but is not
--     supported cleanly on this extension version.
--   - Leaked-password protection is a dashboard Auth toggle (owner action).

alter function public.touch_prime_now_slots() set search_path = public, pg_temp;

create index if not exists invoices_customer_idx on public.invoices (customer_id);
create index if not exists price_history_changed_by_idx on public.price_history (changed_by);
create index if not exists prime_now_requests_customer_idx on public.prime_now_requests (customer_id);
create index if not exists vendor_documents_reviewed_by_idx on public.vendor_documents (reviewed_by);

-- Byte-identical twins; the kept names are the ones other migrations use.
drop index if exists public.uq_vendors_auth_user;
drop index if exists public.idx_vendor_documents_vendor;

-- Same predicates as before, with auth.uid() hoisted into an initplan.
drop policy if exists "read own or admin" on public.admin_users;
create policy "read own or admin" on public.admin_users
  for select using ((id = (select auth.uid())) or is_admin());

drop policy if exists "customer reads own record" on public.customers;
create policy "customer reads own record" on public.customers
  for select using (auth_user_id = (select auth.uid()));

drop policy if exists "customer updates own record" on public.customers;
create policy "customer updates own record" on public.customers
  for update using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

drop policy if exists "vendor reads own row" on public.vendors;
create policy "vendor reads own row" on public.vendors
  for select using (auth_user_id = (select auth.uid()));

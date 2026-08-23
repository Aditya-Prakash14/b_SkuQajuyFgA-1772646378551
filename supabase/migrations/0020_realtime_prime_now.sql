-- ============================================================================
-- 0020 — Prime Now jobs stream to the partner app.
--
-- The app subscribes to its own rows in prime_now_requests; without the table
-- in the publication that subscription is silent and a partner would only see
-- a new Prime Now job on the next pull-to-refresh.
--
-- replica identity full so the RLS filter can see assigned_vendor_id on UPDATE.
-- ============================================================================

alter table public.prime_now_requests replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'prime_now_requests'
  ) then
    alter publication supabase_realtime add table public.prime_now_requests;
  end if;
end $$;

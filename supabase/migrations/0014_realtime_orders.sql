-- ============================================================================
-- 0014 — Realtime for the partner app's job list.
--
-- Adds public.orders to the supabase_realtime publication so the app can
-- subscribe to postgres_changes filtered by assigned_vendor_id and refresh
-- instantly instead of on pull/foreground. Row visibility for subscribers is
-- enforced by the table's RLS — the vendor SELECT policy from 0010 — so a
-- partner only ever receives events for orders assigned to them.
-- Idempotent: adding an already-published table is a no-op here.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;

-- Realtime needs the old row's identity to filter UPDATE/DELETE events by column.
alter table public.orders replica identity full;

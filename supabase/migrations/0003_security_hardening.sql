-- ============================================================================
-- Prime Home Care — Security hardening (0003)
-- Addresses Supabase database-linter advisors after the initial schema.
-- Applied to the live project via the Supabase MCP on 2026-07-08.
-- ============================================================================

-- Advisor 0011 (function_search_path_mutable): pin search_path on the
-- updated_at trigger function.
create or replace function public.set_updated_at() returns trigger
  language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Advisor 0028/0029 (SECURITY DEFINER function executable by anon/authenticated):
-- gen_order_number() and gen_invoice_number() are trigger-only. Revoke REST
-- EXECUTE so they can't be called directly via /rest/v1/rpc/... . Triggers keep
-- firing because trigger execution does not check the caller's EXECUTE grant.
revoke execute on function public.gen_order_number() from anon, authenticated, public;
revoke execute on function public.gen_invoice_number() from anon, authenticated, public;

-- NOTE: is_admin(), is_super_admin() and create_booking() also show as
-- "executable by anon/authenticated" but that is INTENTIONAL:
--   • is_admin / is_super_admin are called inside RLS policies, so the querying
--     roles must retain EXECUTE.
--   • create_booking is the public booking endpoint (validates + re-prices
--     server-side); it is meant to be called by anon.

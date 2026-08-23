-- ============================================================================
-- 0023 — Clean up after 0015–0022.
--
-- 1. upsert_my_vendor_profile got two extra parameters in 0022. Because the
--    signature changed, `create or replace` created a SECOND overload rather
--    than replacing the original — and PostgREST then could not choose between
--    them for a 5-argument call:
--
--      PGRST203  Could not choose the best candidate function between: …
--
--    Any client still sending the old five arguments (an older app bundle)
--    fails on profile save. Drop the superseded overload; the 7-arg version
--    defaults both new params to null, so it accepts everything the old one did.
--
-- 2. auto_dispatch_prime_now() is a trigger function. It was never meant to be
--    callable over the API, but SECURITY DEFINER + the default grant exposed it
--    at /rest/v1/rpc/auto_dispatch_prime_now.
--
-- 3. The two Prime Now trigger helpers were created without a fixed
--    search_path, unlike everything else since 0003.
-- ============================================================================

drop function if exists public.upsert_my_vendor_profile(text, text, text, uuid[], text);

revoke all on function public.auto_dispatch_prime_now() from public, anon, authenticated;

create or replace function public.gen_prime_now_number()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.request_number is null or new.request_number = '' then
    new.request_number := 'PN-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYYMMDD')
                       || '-' || lpad(nextval('public.prime_now_request_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create or replace function public.touch_prime_now_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- 0012 — Push notifications: where a partner's device token lives.
--
-- The partner app registers an Expo push token after sign-in. Assignment only
-- ever happens in the CRM (assignVendor), so the CRM server sends the push
-- straight to Expo's API — no DB trigger / edge function / shared secret.
-- Vendors have no UPDATE policy on their row (by design), so the token is
-- written through a SECURITY DEFINER RPC scoped to current_vendor_id().
-- ============================================================================

alter table public.vendors
  add column if not exists expo_push_token text,
  add column if not exists push_token_updated_at timestamptz;

create or replace function public.register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := current_vendor_id();
begin
  if v_id is null then
    raise exception 'No vendor profile for this account';
  end if;
  -- Expo tokens look like ExponentPushToken[xxxxxxxx]; an empty string clears it (sign-out).
  if p_token is not null and p_token <> '' and p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Not an Expo push token';
  end if;
  update vendors
  set expo_push_token = nullif(p_token, ''),
      push_token_updated_at = now()
  where id = v_id;
end;
$$;

revoke execute on function public.register_push_token(text) from public, anon;
grant  execute on function public.register_push_token(text) to authenticated;

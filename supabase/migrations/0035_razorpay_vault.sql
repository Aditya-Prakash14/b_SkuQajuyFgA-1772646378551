-- 0035: Razorpay credentials through Vault.
--
-- The CLI path for function secrets (`supabase secrets set`) needs an access
-- token this environment does not have, so the Razorpay functions follow the
-- notify-customer precedent (0030): the three credentials live in Vault and
-- the edge functions fetch them with the service role through
-- razorpay_secret(). Env vars still win when present, so moving to real
-- function secrets later needs no code change.
--
-- The secret VALUES are deliberately not in this file — they are inserted
-- directly with vault.create_secret(...) (names: razorpay_key_id,
-- razorpay_key_secret, razorpay_webhook_secret). To rotate:
--   select vault.update_secret(id, '<new value>')
--   from vault.secrets where name = 'razorpay_key_secret';

create or replace function public.razorpay_secret(p_name text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_name
    and p_name in ('razorpay_key_id', 'razorpay_key_secret', 'razorpay_webhook_secret')
  limit 1;
$$;

revoke execute on function public.razorpay_secret(text) from public, anon, authenticated;
grant  execute on function public.razorpay_secret(text) to service_role;

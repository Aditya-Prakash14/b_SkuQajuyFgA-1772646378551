-- ============================================================================
-- 0028 — Customer app: live timeline, Prime Now cancel, one default address.
--
-- Three things the app already promised that the schema did not deliver:
--
--   • The tracking screen subscribes to booking_events, but the table was never
--     added to the realtime publication — the channel subscribed fine and then
--     delivered nothing. Pull-to-refresh hid it.
--   • "Cancel request" on the Prime Now matching screen only navigated away.
--     Nothing wrote status = 'cancelled' (prime_now_requests had no customer
--     write path at all), so auto-dispatch kept offering the job to partners
--     for a customer who believed it was gone.
--   • 0027 says "a partial unique index enforces one default address per
--     customer". No migration ever created it. save_my_address() demotes the
--     old default first, but the addresses policy is FOR ALL, so a direct
--     insert could leave two defaults and the app would pick one at random.
-- ============================================================================

-- ── 1. Timeline streams ─────────────────────────────────────────────────────

alter table public.booking_events replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_events'
  ) then
    alter publication supabase_realtime add table public.booking_events;
  end if;
end
$$;

-- ── 2. Customer cancels a Prime Now request ─────────────────────────────────

/**
 * Allowed while the request is still 'new' (no one has taken it) or
 * 'dispatched' (a partner accepted but has not started). Once work is in
 * progress the customer is told to call — the partner is on site and a silent
 * cancel would leave them unpaid.
 *
 * Open offers are superseded so the job disappears from every partner's
 * banner at once; escalate_offers() only re-broadcasts status = 'new', so a
 * cancelled request never gets another wave.
 */
create or replace function public.cancel_prime_now_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer uuid := current_customer_id();
  v_status   text;
begin
  if v_customer is null then
    raise exception 'Please sign in';
  end if;

  select status into v_status
  from prime_now_requests
  where id = p_request_id and customer_id = v_customer
  for update;

  if v_status is null then
    raise exception 'This request can no longer be cancelled';
  end if;
  if v_status = 'cancelled' then
    return;
  end if;
  if v_status not in ('new', 'dispatched') then
    raise exception 'Your helper has already started. Please call us on +91 73496 03429 to change this booking.';
  end if;

  update prime_now_requests set status = 'cancelled' where id = p_request_id;

  update job_offers
     set status = 'superseded', responded_at = now()
   where kind = 'prime_now' and job_id = p_request_id and status = 'offered';
end;
$$;

revoke execute on function public.cancel_prime_now_request(uuid) from public, anon;
grant  execute on function public.cancel_prime_now_request(uuid) to authenticated;

-- ── 3. One default address per customer ─────────────────────────────────────

-- Demote any extra defaults before the index would refuse them. Keeps the
-- lowest id, which is arbitrary but deterministic; no live customer has two.
update public.addresses a
   set is_default = false
 where a.is_default
   and exists (
     select 1 from public.addresses b
     where b.customer_id = a.customer_id
       and b.is_default
       and b.id < a.id
   );

create unique index if not exists addresses_one_default_per_customer
  on public.addresses (customer_id)
  where is_default;

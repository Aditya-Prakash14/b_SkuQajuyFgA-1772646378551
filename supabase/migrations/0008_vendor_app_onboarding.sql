-- ============================================================================
-- Prime Home Care — Vendor self-onboarding (0008)
--
-- Backfilled from the live database (applied there as `vendor_app_onboarding`,
-- version 20260728031004) which had drifted ahead of this repo. Re-created here
-- idempotently so `apply-all.sql` and a fresh environment reproduce production.
--
-- Adds the partner-app side of vendor onboarding:
--   1. vendors gains an auth identity (auth_user_id) + a wizard cursor
--      (onboarding_step) so a partner can resume where they left off.
--   2. vendor_documents — one row per uploaded KYC document, reviewed by admin.
--   3. RPCs the partner app calls. All SECURITY DEFINER: a vendor never gets
--      direct table grants, exactly as create_booking() works for customers.
-- ============================================================================

-- ─── 1. vendors: auth identity + onboarding cursor ──────────────────────────

alter table vendors add column if not exists auth_user_id uuid references auth.users(id);
alter table vendors add column if not exists application_note text;
alter table vendors add column if not exists onboarding_step text not null default 'profile';
alter table vendors add column if not exists submitted_at timestamptz;
alter table vendors add column if not exists rejection_reason text;

do $$ begin
  alter table vendors add constraint vendors_onboarding_step_check
    check (onboarding_step in ('profile','documents','review','done'));
exception when duplicate_object then null; end $$;

-- One auth user maps to at most one vendor; current_vendor_id() assumes it.
create unique index if not exists vendors_auth_user_id_key
  on vendors (auth_user_id) where auth_user_id is not null;

create index if not exists vendors_phone_idx on vendors (phone);

-- ─── 2. vendor_documents ────────────────────────────────────────────────────

create table if not exists vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  doc_type text not null
    check (doc_type in ('aadhaar','pan','address_proof','bank_proof','police_verification','photo')),
  -- Object key inside the private `vendor-docs` bucket. Always '<vendor_id>/<doc_type>.<ext>'
  -- so the storage RLS policy in 0009 can authorise on the first path segment.
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  review_note text,
  uploaded_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references admin_users(id),
  -- Re-uploading a document replaces it rather than accumulating duplicates.
  unique (vendor_id, doc_type)
);

create index if not exists vendor_documents_vendor_idx on vendor_documents (vendor_id);

alter table vendor_documents enable row level security;

-- ─── 3. Helper: which vendor is the caller? ─────────────────────────────────

create or replace function current_vendor_id() returns uuid
  language sql stable security definer set search_path = public, pg_temp
as $$
  select id from vendors where auth_user_id = auth.uid() limit 1;
$$;

-- ─── 4. RLS ─────────────────────────────────────────────────────────────────

drop policy if exists "vendor reads own row" on vendors;
create policy "vendor reads own row" on vendors
  for select using (auth_user_id = auth.uid());

drop policy if exists "vendor reads own docs" on vendor_documents;
create policy "vendor reads own docs" on vendor_documents
  for select using (vendor_id = current_vendor_id());

-- A vendor may only ever file a *pending* document. Forcing status here stops a
-- partner from self-approving their own KYC by inserting status='verified'.
drop policy if exists "vendor adds own pending docs" on vendor_documents;
create policy "vendor adds own pending docs" on vendor_documents
  for insert with check (vendor_id = current_vendor_id() and status = 'pending');

-- Replace-before-verification only. 'rejected' is included deliberately: the
-- live policy allowed 'pending' alone, which dead-ended onboarding — an admin
-- rejecting a document left the partner unable to delete it and unable to
-- insert a replacement (unique (vendor_id, doc_type)), so the account could
-- never reach approval. 'verified' stays excluded so an approved document
-- cannot be swapped out from under the approver.
drop policy if exists "vendor deletes own pending docs" on vendor_documents;
create policy "vendor deletes own pending docs" on vendor_documents
  for delete using (vendor_id = current_vendor_id() and status in ('pending','rejected'));

drop policy if exists "admin manages docs" on vendor_documents;
create policy "admin manages docs" on vendor_documents
  for all using (is_admin()) with check (is_admin());

-- ─── 5. RPCs called by the partner app ──────────────────────────────────────

-- Links the signed-in auth user to a vendor row. Three cases, in order:
--   a) already linked            → return it (idempotent, safe to call on boot)
--   b) an unclaimed row matches the phone number → claim it. This is what turns
--      a "Become a Partner" web application (submit_vendor_application, 0004)
--      into a real account without re-typing anything.
--   c) nothing matches          → create a fresh pending vendor.
create or replace function claim_vendor(
  p_name text, p_phone text, p_email text, p_city text
) returns uuid
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_phone text := trim(p_phone);
begin
  if v_uid is null then raise exception 'Please sign in'; end if;
  select id into v_id from vendors where auth_user_id = v_uid limit 1;
  if v_id is not null then return v_id; end if;

  update vendors set auth_user_id = v_uid, name = coalesce(nullif(trim(p_name),''), name),
         email = coalesce(nullif(trim(p_email),''), email), city = coalesce(nullif(trim(p_city),''), city)
   where phone = v_phone and auth_user_id is null
  returning id into v_id;
  if v_id is not null then return v_id; end if;

  -- Phone is the identity key for partners; refuse to hand one account's
  -- number to a different auth user.
  if exists (select 1 from vendors where phone = v_phone and auth_user_id is not null and auth_user_id <> v_uid) then
    raise exception 'This phone number is already registered to another partner';
  end if;

  insert into vendors (name, phone, email, city, status, auth_user_id)
  values (trim(p_name), v_phone, nullif(trim(p_email),''), nullif(trim(p_city),''), 'pending', v_uid)
  returning id into v_id;
  return v_id;
end;
$$;

-- Step 1 of the wizard. Advances profile → documents, and is a no-op on the
-- cursor once past that, so editing details later cannot rewind onboarding.
create or replace function upsert_my_vendor_profile(
  p_name text, p_email text, p_city text, p_services uuid[], p_note text default null
) returns void
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid := current_vendor_id();
begin
  if v_id is null then raise exception 'No vendor profile for this account'; end if;
  update vendors set
    name = coalesce(nullif(trim(p_name),''), name),
    email = coalesce(nullif(trim(p_email),''), email),
    city = coalesce(nullif(trim(p_city),''), city),
    services_offered = coalesce(p_services, services_offered),
    application_note = coalesce(nullif(trim(p_note),''), application_note),
    onboarding_step = case when onboarding_step = 'profile' then 'documents' else onboarding_step end
  where id = v_id;
end;
$$;

-- Step 3. Gated on the four mandatory KYC documents being present.
-- police_verification and photo are optional and deliberately not required.
create or replace function submit_vendor_for_review() returns void
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid := current_vendor_id(); v_missing int;
begin
  if v_id is null then raise exception 'No vendor profile for this account'; end if;
  select count(*) into v_missing from (
    select unnest(array['aadhaar','pan','address_proof','bank_proof']) as t
  ) req left join vendor_documents d
    on d.vendor_id = v_id and d.doc_type = req.t
  where d.id is null;
  if v_missing > 0 then raise exception 'Please upload all required documents before submitting'; end if;

  -- Only pending/rejected may be (re)submitted; an approved partner re-running
  -- this must not be knocked back into review.
  update vendors set onboarding_step = 'review', submitted_at = now()
  where id = v_id and status in ('pending','rejected');
end;
$$;

-- ─── 6. Grants ──────────────────────────────────────────────────────────────
-- `authenticated` only: unlike create_booking(), every one of these needs a
-- real auth.uid(), and each re-checks it internally.

revoke all on function claim_vendor(text, text, text, text) from public, anon;
revoke all on function upsert_my_vendor_profile(text, text, text, uuid[], text) from public, anon;
revoke all on function submit_vendor_for_review() from public, anon;
revoke all on function current_vendor_id() from public, anon;

-- service_role is named explicitly: revoking from PUBLIC strips its implicit
-- grant as well, which would break any future server-side call.
grant execute on function claim_vendor(text, text, text, text) to authenticated, service_role;
grant execute on function upsert_my_vendor_profile(text, text, text, uuid[], text) to authenticated, service_role;
grant execute on function submit_vendor_for_review() to authenticated, service_role;
grant execute on function current_vendor_id() to authenticated, service_role;

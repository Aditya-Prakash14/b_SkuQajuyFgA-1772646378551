-- ============================================================================
-- 0027 — Let a customer create their profile and address before their first
--        booking.
--
-- The customer app's setup flow asks for a name and an address up front, but
-- until now a `customers` row was only ever created by create_booking(). So:
--
--   • current_customer_id() returned NULL for a brand-new account, and
--   • the addresses policy (customer_id = current_customer_id()) rejected the
--     insert with "new row violates row-level security policy".
--
-- `customers` also has no INSERT policy — deliberately, so a client cannot
-- invent rows — which means the fix has to be SECURITY DEFINER, not a policy.
--
-- The phone-collision guard mirrors create_booking() exactly: a phone already
-- claimed by a different account must not be silently re-pointed.
-- ============================================================================

create or replace function public.upsert_my_profile(
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_city text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  v_city  text := nullif(btrim(coalesce(p_city, '')), '');
begin
  if v_uid is null then
    raise exception 'Please sign in first';
  end if;
  if v_name is null then
    raise exception 'Please tell us your name';
  end if;

  select id into v_id from customers where auth_user_id = v_uid limit 1;

  if v_id is not null then
    update customers set
      name  = v_name,
      email = coalesce(v_email, email),
      city  = coalesce(v_city, city),
      phone = case
                when v_phone is null then phone
                when v_phone = phone then phone
                when exists (select 1 from customers c2 where c2.phone = v_phone and c2.id <> v_id) then phone
                else v_phone
              end
    where id = v_id;
    return v_id;
  end if;

  -- A row may already exist for this phone from a website or CRM booking made
  -- before the customer ever signed in — adopt it rather than duplicating.
  if v_phone is not null then
    if exists (
      select 1 from customers
      where phone = v_phone and auth_user_id is not null and auth_user_id <> v_uid
    ) then
      raise exception 'This phone number is already linked to a different account';
    end if;

    update customers set
      auth_user_id = v_uid,
      name = v_name,
      email = coalesce(v_email, email),
      city = coalesce(v_city, city)
    where phone = v_phone and auth_user_id is null
    returning id into v_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  -- customers.phone is NOT NULL. A customer who signed in with Google has not
  -- given us one yet, so hold the auth user id until checkout supplies a real
  -- number; it is unique per account and never shown.
  insert into customers (name, phone, email, city, auth_user_id)
  values (v_name, coalesce(v_phone, 'pending:' || v_uid::text), v_email, v_city, v_uid)
  returning id into v_id;

  return v_id;
end;
$$;

/**
 * Save an address for the caller, creating the profile row if the setup flow
 * has not yet. Returns the address id.
 */
create or replace function public.save_my_address(
  p_label text,
  p_full_address text,
  p_city text,
  p_is_default boolean default true,
  p_name text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer uuid := current_customer_id();
  v_id uuid;
  v_addr text := nullif(btrim(coalesce(p_full_address, '')), '');
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
begin
  if v_addr is null then
    raise exception 'Please enter the address';
  end if;
  if v_city is null then
    raise exception 'Please pick your city';
  end if;

  if v_customer is null then
    if nullif(btrim(coalesce(p_name, '')), '') is null then
      raise exception 'Please complete your profile first';
    end if;
    v_customer := upsert_my_profile(p_name, null, p_phone, v_city);
  end if;

  -- One default per customer; a partial unique index enforces it, so demote
  -- the previous default before promoting this one.
  if coalesce(p_is_default, true) then
    update addresses set is_default = false where customer_id = v_customer and is_default;
  end if;

  insert into addresses (customer_id, label, full_address, city, is_default)
  values (v_customer, nullif(btrim(coalesce(p_label, '')), ''), v_addr, v_city, coalesce(p_is_default, true))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.upsert_my_profile(text, text, text, text) from public, anon;
grant  execute on function public.upsert_my_profile(text, text, text, text) to authenticated;
revoke execute on function public.save_my_address(text, text, text, boolean, text, text) from public, anon;
grant  execute on function public.save_my_address(text, text, text, boolean, text, text) to authenticated;

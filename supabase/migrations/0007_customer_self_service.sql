-- ============================================================================
-- MyPrimeCompany — Customer self-service (Tier 2) (0007)
--
-- Until now the anon/authenticated site could only WRITE a booking (via
-- create_booking) and never READ anything back. This opens a customer account:
--
--   • signed-in customers may read their own customer row, orders and items,
--     and fully manage their own addresses — scoped by customers.auth_user_id.
--   • self-service mutations (reschedule / cancel / review) go through
--     SECURITY DEFINER RPCs so the allowed transitions are enforced server-side,
--     not left to a broad UPDATE policy.
--   • a reviews table + verified submit_review() (only for a COMPLETED order you
--     own) with a trigger that keeps services.rating / reviews_count in sync.
--   • orders gain a time slot; create_booking() records it and files the typed
--     address into the customer's address book.
-- ============================================================================

-- ─── Identity helper (definer → no recursive RLS) ────────────────────────────
create or replace function current_customer_id() returns uuid
  language sql security definer stable set search_path = public, pg_temp as $$
  select id from customers where auth_user_id = auth.uid() limit 1;
$$;
grant execute on function current_customer_id() to authenticated;

-- ─── Time slot on orders ─────────────────────────────────────────────────────
alter table orders add column if not exists scheduled_slot text;

-- ─── Reviews ─────────────────────────────────────────────────────────────────
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id)    on delete cascade,
  service_id  uuid references services(id)  on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  unique (order_id, service_id)   -- one review per service per order
);
create index if not exists idx_reviews_service  on reviews (service_id);
create index if not exists idx_reviews_customer on reviews (customer_id);

alter table reviews enable row level security;

-- ─── Customer self-service RLS (additive to the existing admin policies) ─────
-- customers: read + update your OWN profile row
create policy "customer reads own record" on customers
  for select using (auth_user_id = auth.uid());
create policy "customer updates own record" on customers
  for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- orders / order_items: read your OWN (no direct write — see the RPCs below)
create policy "customer reads own orders" on orders
  for select using (customer_id = current_customer_id());
create policy "customer reads own order items" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_items.order_id and o.customer_id = current_customer_id())
  );

-- addresses: full CRUD over your OWN address book
create policy "customer manages own addresses" on addresses
  for all
  using (customer_id = current_customer_id())
  with check (customer_id = current_customer_id());

-- reviews: world-readable (shown on service pages); edit/remove your own.
-- INSERT is intentionally omitted — it must go through submit_review().
create policy "public reads reviews" on reviews
  for select using (true);
create policy "customer updates own review" on reviews
  for update using (customer_id = current_customer_id()) with check (customer_id = current_customer_id());
create policy "customer deletes own review" on reviews
  for delete using (customer_id = current_customer_id());
create policy "admin full access reviews" on reviews
  for all using (is_admin()) with check (is_admin());

-- ─── Keep services.rating / reviews_count in sync with real reviews ──────────
create or replace function refresh_service_rating() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
declare v_sid uuid := coalesce(new.service_id, old.service_id);
begin
  update services s set
    rating = coalesce((select round(avg(rating)::numeric, 1) from reviews where service_id = v_sid), s.rating),
    reviews_count = (select count(*) from reviews where service_id = v_sid)
  where s.id = v_sid;
  return null;
end;
$$;
create trigger trg_reviews_rating
  after insert or update or delete on reviews
  for each row execute function refresh_service_rating();

-- ─── Self-service RPCs ───────────────────────────────────────────────────────

-- Reschedule an order you own, while it is still pending/confirmed.
create or replace function reschedule_booking(p_order_id uuid, p_date date, p_slot text default null)
  returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_cust uuid := current_customer_id();
begin
  if v_cust is null then raise exception 'Please sign in'; end if;
  if p_date < current_date then raise exception 'Pick a future date'; end if;
  update orders
     set scheduled_date = p_date,
         scheduled_slot = coalesce(nullif(trim(p_slot), ''), scheduled_slot)
   where id = p_order_id and customer_id = v_cust and status in ('pending','confirmed');
  if not found then
    raise exception 'This booking can no longer be rescheduled';
  end if;
end;
$$;
grant execute on function reschedule_booking(uuid, date, text) to authenticated;

-- Cancel an order you own, while it is still pending/confirmed.
create or replace function cancel_booking(p_order_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_cust uuid := current_customer_id();
begin
  if v_cust is null then raise exception 'Please sign in'; end if;
  update orders set status = 'cancelled'
   where id = p_order_id and customer_id = v_cust and status in ('pending','confirmed');
  if not found then
    raise exception 'This booking can no longer be cancelled';
  end if;
end;
$$;
grant execute on function cancel_booking(uuid) to authenticated;

-- Submit/update a review — only for a COMPLETED order you own that actually
-- contained the service. Upserts on (order_id, service_id).
create or replace function submit_review(p_order_id uuid, p_service_id uuid, p_rating int, p_comment text default null)
  returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_cust uuid := current_customer_id();
begin
  if v_cust is null then raise exception 'Please sign in'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1–5'; end if;
  if not exists (
    select 1 from orders o
    where o.id = p_order_id and o.customer_id = v_cust and o.status = 'completed'
  ) then
    raise exception 'You can only review a completed booking of your own';
  end if;
  if not exists (
    select 1 from order_items oi where oi.order_id = p_order_id and oi.service_id = p_service_id
  ) then
    raise exception 'That service was not part of this booking';
  end if;

  insert into reviews (order_id, service_id, customer_id, rating, comment)
  values (p_order_id, p_service_id, v_cust, p_rating, nullif(trim(p_comment), ''))
  on conflict (order_id, service_id) do update
    set rating = excluded.rating, comment = excluded.comment, created_at = now();
end;
$$;
grant execute on function submit_review(uuid, uuid, int, text) to authenticated;

-- ─── create_booking(): add a time slot + file the address in the book ───────
drop function if exists create_booking(text, text, text, text, text, date, jsonb, text);

create or replace function create_booking(
  p_name           text,
  p_phone          text,
  p_email          text,
  p_city           text,
  p_address        text,
  p_scheduled_date date,
  p_items          jsonb,
  p_notes          text default null,
  p_slot           text default null
) returns jsonb
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid         uuid := auth.uid();
  v_customer_id uuid;
  v_order_id    uuid;
  v_order_no    text;
  v_gross       numeric(10,2) := 0;
  v_total       numeric(10,2);
  v_taxable     numeric(10,2);
  v_tax         numeric(10,2);
  v_item        jsonb;
  v_service     services%rowtype;
  v_qty         int;
  v_line_total  numeric(10,2);
  v_name        text := trim(p_name);
  v_phone       text := trim(p_phone);
  v_email       text := nullif(trim(p_email), '');
  v_address     text := trim(p_address);
begin
  if v_uid is null then
    raise exception 'Please sign in to place a booking';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'No items in booking';
  end if;
  if coalesce(v_name, '') = '' or coalesce(v_phone, '') = '' then
    raise exception 'Name and phone are required';
  end if;

  -- Resolve customer by IDENTITY, never by phone alone (anti-hijack, see 0006).
  select id into v_customer_id from customers where auth_user_id = v_uid limit 1;

  if v_customer_id is not null then
    update customers set
      name  = v_name,
      email = coalesce(v_email, email),
      city  = coalesce(p_city, city),
      phone = case
                when v_phone = phone then phone
                when exists (select 1 from customers c2 where c2.phone = v_phone and c2.id <> v_customer_id) then phone
                else v_phone
              end
    where id = v_customer_id;
  else
    if exists (
      select 1 from customers
      where phone = v_phone and auth_user_id is not null and auth_user_id <> v_uid
    ) then
      raise exception 'This phone number is already linked to a different account';
    end if;
    update customers set
      auth_user_id = v_uid, name = v_name,
      email = coalesce(v_email, email), city = coalesce(p_city, city)
    where phone = v_phone and auth_user_id is null
    returning id into v_customer_id;
    if v_customer_id is null then
      insert into customers (name, phone, email, city, auth_user_id)
      values (v_name, v_phone, v_email, p_city, v_uid)
      returning id into v_customer_id;
    end if;
  end if;

  insert into orders (customer_id, status, scheduled_date, scheduled_slot, city, address,
                      subtotal, tax, total, source, notes)
  values (v_customer_id, 'pending', p_scheduled_date, nullif(trim(p_slot), ''), p_city, v_address,
          0, 0, 0, 'website', nullif(trim(p_notes), ''))
  returning id, order_number into v_order_id, v_order_no;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);
    select * into v_service from services
      where id = (v_item->>'service_id')::uuid and is_active = true;
    if not found then
      raise exception 'Service % is not available', v_item->>'service_id';
    end if;
    v_line_total := v_service.price * v_qty;
    v_gross := v_gross + v_line_total;
    insert into order_items (order_id, service_id, service_name, unit_price, qty, line_total)
    values (v_order_id, v_service.id, v_service.name, v_service.price, v_qty, v_line_total);
  end loop;

  -- Tax-inclusive GST (see packages/shared/tax.ts).
  v_total   := round(v_gross, 2);
  v_taxable := round(v_total / 1.18, 2);
  v_tax     := v_total - v_taxable;
  update orders set subtotal = v_taxable, tax = v_tax, total = v_total where id = v_order_id;

  -- File this address in the customer's book (dedupe on the text), first = default.
  if v_address <> '' and not exists (
    select 1 from addresses where customer_id = v_customer_id and full_address = v_address
  ) then
    insert into addresses (customer_id, label, full_address, city, is_default)
    values (
      v_customer_id, 'Home', v_address, p_city,
      not exists (select 1 from addresses where customer_id = v_customer_id)
    );
  end if;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_no);
end;
$$;

grant execute on function create_booking(text, text, text, text, text, date, jsonb, text, text)
  to anon, authenticated;

-- ============================================================================
-- 0031 — Payments and receipts groundwork (docs/customer-app-master-prompt.md
--        Phase 3: §3.1, §3.4, §3.6). Everything here works without a payment
--        gateway; the Razorpay edge functions plug into it when keys exist.
--
--   1. payments — one row per money movement, whatever the rail. Today that
--      is cash / UPI collected on completion (written by a trigger when
--      payment_status flips to 'paid'); tomorrow Razorpay captures and
--      refunds. A customer reads their own rows; only functions write.
--   2. paid_at, and a cancellation audit (who, when, why) on both job tables.
--      cancel_booking() / cancel_prime_now_request() record the customer;
--      the CRM's dropdown still only writes status, so the audit is best
--      effort there until the CRM is updated.
--   3. invoices — the CRM issues GST invoices; the customer could not read
--      them. Own-row SELECT, plus a private bucket for the PDFs with
--      per-customer folders, ready for generate-invoice.
-- ============================================================================

-- ── 1. Payments ledger ──────────────────────────────────────────────────────

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('deep_clean', 'prime_now')),
  job_id uuid not null,
  customer_id uuid references public.customers(id) on delete set null,
  provider text not null check (provider in ('razorpay', 'cash', 'upi_manual')),
  method text,
  purpose text not null default 'booking' check (purpose in ('booking', 'tip')),
  provider_order_id text,
  provider_payment_id text unique,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_job_idx on public.payments (kind, job_id);
create index if not exists payments_customer_idx on public.payments (customer_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "admin manages payments" on public.payments;
create policy "admin manages payments" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer reads own payments" on public.payments;
create policy "customer reads own payments" on public.payments
  for select to authenticated
  using (customer_id = public.current_customer_id());

-- ── 2. paid_at and the cancellation audit ───────────────────────────────────

alter table public.orders
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text check (cancelled_by in ('customer', 'ops', 'partner', 'system')),
  add column if not exists cancellation_reason text;

alter table public.prime_now_requests
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text check (cancelled_by in ('customer', 'ops', 'partner', 'system')),
  add column if not exists cancellation_reason text;

-- Whatever flips payment_status to 'paid' — the partner's cash checkbox, the
-- CRM marking an invoice paid, a future gateway webhook — stamps paid_at and
-- leaves a ledger row, so the receipt never has to guess.
create or replace function public.record_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kind text := case when tg_table_name = 'orders' then 'deep_clean' else 'prime_now' end;
  v_provider text;
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    if new.paid_at is null then
      new.paid_at := now();
    end if;
    v_provider := case lower(coalesce(new.payment_method, ''))
                    when 'cash' then 'cash'
                    when 'razorpay' then 'razorpay'
                    else 'upi_manual'
                  end;
    if not exists (
      select 1 from payments p
      where p.kind = v_kind and p.job_id = new.id and p.purpose = 'booking' and p.status = 'captured'
    ) then
      insert into payments (kind, job_id, customer_id, provider, method, amount, status, raw)
      values (v_kind, new.id, new.customer_id, v_provider, new.payment_method,
              case when tg_table_name = 'orders' then new.total else new.price end,
              'captured', jsonb_build_object('source', 'payment_status'));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_record_payment on public.orders;
create trigger orders_record_payment
  before update of payment_status on public.orders
  for each row execute function public.record_payment();

drop trigger if exists prime_now_record_payment on public.prime_now_requests;
create trigger prime_now_record_payment
  before update of payment_status on public.prime_now_requests
  for each row execute function public.record_payment();

-- Cancels record who and when. Same signatures as 0007 / 0028.
create or replace function public.cancel_booking(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_cust uuid := current_customer_id();
begin
  if v_cust is null then raise exception 'Please sign in'; end if;
  update orders
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer'
   where id = p_order_id and customer_id = v_cust and status in ('pending', 'confirmed');
  if not found then
    raise exception 'This booking can no longer be cancelled';
  end if;
end;
$$;

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

  update prime_now_requests
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer'
   where id = p_request_id;

  update job_offers
     set status = 'superseded', responded_at = now()
   where kind = 'prime_now' and job_id = p_request_id and status = 'offered';
end;
$$;

-- ── 3. Invoices a customer can see ──────────────────────────────────────────

drop policy if exists "customer reads own invoices" on public.invoices;
create policy "customer reads own invoices" on public.invoices
  for select to authenticated
  using (customer_id = public.current_customer_id());

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do update set public = false;

drop policy if exists "admin rw invoices" on storage.objects;
create policy "admin rw invoices" on storage.objects
  for all to authenticated
  using (bucket_id = 'invoices' and public.is_admin())
  with check (bucket_id = 'invoices' and public.is_admin());

-- Layout: <customer_id>/<invoice_number>.pdf — the first path segment is the tenant key.
drop policy if exists "customer reads own invoice files" on storage.objects;
create policy "customer reads own invoice files" on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = public.current_customer_id()::text);

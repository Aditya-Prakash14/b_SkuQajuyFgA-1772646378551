# Supabase Backend — MyPrimeCompany

One Supabase project is the single source of truth for both apps:

- **Marketing site** (`apps/web`) — uses the **anon** key. Reads the active catalog; books via the `create_booking()` RPC only.
- **CRM** (`apps/crm`) — uses **authenticated admin** sessions (+ the service-role key server-side for admin invites).

```
supabase/
├─ migrations/
│  ├─ 0001_schema.sql   Tables, triggers, auto-numbering, indexes
│  └─ 0002_rls.sql      RLS policies, is_admin()/is_super_admin(), create_booking() RPC
└─ seed/
   ├─ reference-data.sql   Service categories + cities (idempotent SQL)
   └─ seed-services.ts     Migrates the 18 existing services (run with `pnpm seed`)
```

## 1. Create the project

1. Create a new project at [supabase.com](https://supabase.com). Pick a region close to your users (India → Mumbai `ap-south-1`).
2. **Project Settings → API** → copy the **Project URL**, the **anon public** key, and the **service_role** key.
3. **Authentication → Providers → Email**: keep email/password enabled, and **turn OFF "Enable email signups"** (admin-only; accounts are provisioned, never self-registered).

## 2. Run the migrations

Either paste each file into **SQL Editor** (in order), or use the CLI:

```bash
# CLI option
supabase link --project-ref YOUR-PROJECT-REF
supabase db push        # applies migrations/*.sql in order
```

SQL Editor option — run in this exact order:

1. `migrations/0001_schema.sql`
2. `migrations/0002_rls.sql`
3. `seed/reference-data.sql`

## 3. Seed the services

From the **repo root**, create `.env` (copy from `.env.example`) with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then:

```bash
pnpm install        # first time only
pnpm seed           # upserts the 18 services by slug (safe to re-run)
```

Expected output ends with `✓ Seed complete`. Verify in **Table Editor → services** (18 rows) and **service_categories** (6 rows).

## 4. Bootstrap the first admin

There is **no signup form anywhere**. Create the first `super_admin` by hand:

1. **Authentication → Users → Add user** → create with an email + password (check "Auto Confirm").
2. Copy that user's **UID**.
3. In **SQL Editor**, insert the matching `admin_users` row:

```sql
insert into admin_users (id, full_name, email, role, is_active)
values (
  'PASTE-AUTH-USER-UID-HERE',
  'Your Name',
  'you@primehomecare.in',
  'super_admin',
  true
);
```

That account can now log into the CRM at `/login`. Further staff are invited from **CRM → Settings → Admin Users** (which creates the auth user via the service-role key and inserts the `admin_users` row for you).

## 5. Storage buckets (needed by Vendors + Invoicing modules)

In **Storage**, create two **private** buckets:

| Bucket        | Purpose                          | Access                        |
| ------------- | -------------------------------- | ----------------------------- |
| `vendor-docs` | ID proof, police verification    | Private — signed URLs only    |
| `invoices`    | Generated invoice PDFs           | Private — signed URLs only    |

An optional `service-images` **public** bucket can hold service hero/gallery images uploaded from the CRM. (Until then, services reference the existing `apps/web/public/*.jpg` paths.)

## Notes / deviations from the original brief

- **`vendors` is created before `orders`** in `0001` — the brief's ordering (`orders` first) fails because `orders.assigned_vendor_id` references `vendors`.
- **`order_number` / `invoice_number` auto-generate** via `BEFORE INSERT` triggers (`PHC-YYYYMMDD-####`, `INV-YYYY-####`), so clients never compute them.
- **Public writes go through `create_booking()` only** — the brief's raw anon `INSERT` policies are omitted on purpose: anon has no `SELECT` policy (so `INSERT ... RETURNING` would be denied and the multi-row booking couldn't link its items), and raw insert would let anyone submit tampered totals. The RPC re-prices every line from the live `services` table and writes atomically.

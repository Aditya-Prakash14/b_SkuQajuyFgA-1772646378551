# MyPrimeCompany — Low-Level Design (LLD)

Version: 2026-07-08 · Status: implemented & verified against live Supabase (`wsdmfleivhzyeqsmojgm`)

A two-app product on one Supabase backend: a **public marketing/booking site** and an
**internal CRM**. This document is the low-level design — data model, security model,
module internals, request flows, and contracts — as actually built.

---

## 1. Goals & constraints

- One Supabase project (Postgres + Auth + RLS) is the **single source of truth**.
- The **CRM is admin-only** — no public sign-up; accounts are provisioned by a super admin.
- The **website reads the catalog from Supabase** and **writes bookings** into it.
- Money is `numeric(10,2)` end-to-end; formatted with `Intl.NumberFormat('en-IN', INR)`.
- Both apps share the same design tokens (new-york/shadcn, Geist, indigo/orange).

---

## 2. Architecture

### 2.1 Monorepo topology (pnpm workspaces)

```
prime-home-care/
├─ apps/
│  ├─ web/          Next 16 marketing site (anon Supabase)         :3000
│  ├─ crm/          Next 16 admin console (auth + service-role)    :3001
│  └─ partner/      Expo / React Native partner onboarding app     (Metro)
├─ packages/
│  └─ shared/       DB types (generated), enums, jsonb shapes, formatINR, theme.css
├─ supabase/
│  ├─ migrations/   0001_schema · 0002_rls · 0003_security_hardening ·
│  │                0004_web_auth_and_partner_applications · 0005_catalog_taxonomy ·
│  │                0006_booking_identity_and_gst · 0007_customer_self_service ·
│  │                0008_vendor_app_onboarding · 0009_vendor_docs_storage
│  ├─ seed/         reference-data.sql · seed-services.ts · bootstrap-admin.ts
│  └─ apply-all.sql one-shot bundle
└─ pnpm-workspace.yaml
```

`apps/partner` is **excluded** from the pnpm workspace and installed with npm.
Expo's Metro resolver walks real directories and breaks on pnpm's symlinked
store without `node-linker=hoisted`, which would re-link every dependency the
two Next apps use. Consequence: it cannot import `@prime/shared`, so the schema
slice it needs is hand-maintained in `apps/partner/src/lib/types.ts`.

### 2.2 Runtime data flow

```
        ┌──────────────┐   anon key (RLS)    ┌───────────────────────────┐
        │  apps/web    │────read catalog────▶│         Supabase          │
        │ (marketing)  │────create_booking──▶│  Postgres + Auth + RLS    │
        └──────────────┘        RPC          │                           │
                                              │  • 11 tables (RLS on)     │
        ┌──────────────┐  auth session (RLS) │  • create_booking() RPC   │
        │  apps/crm    │◀──read/write all───▶│  • is_admin() predicates  │
        │  (admin)     │  service-role (Auth │  • numbering triggers     │
        └──────────────┘   admin: invites)   └───────────────────────────┘
```

- **Website → Supabase**: anon key only. Reads are gated by RLS to the *active* catalog;
  the sole write path is the `create_booking()` RPC.
- **CRM → Supabase**: authenticated admin session for all reads/writes (RLS via `is_admin()`);
  the **service-role** key is used **server-side only** for Auth-admin operations (staff invites).

### 2.3 Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · shadcn (new-york) ·
`@supabase/supabase-js` (web) + `@supabase/ssr` (crm) · `recharts` (dashboard) · `sonner` (toasts) ·
`react-hook-form` + `zod` (service form).

---

## 3. Data model

11 tables, all with RLS enabled. Money = `numeric(10,2)`; ids = `uuid` (`gen_random_uuid()`).

### 3.1 Entity map

```
service_categories ─1─┐
                       └─< services >─┐            admin_users ─1─< price_history >─ services
cities (reference)                    ├─< order_items >─ orders ─┐
customers ─1─< addresses              │                          ├─ vendors (assigned_vendor_id)
customers ─1─< orders ────────────────┘                          │
orders ─1─< invoices >─ customers                                 └─ order_items
```

### 3.2 Tables (key columns)

| Table | Purpose | Notable columns |
|---|---|---|
| `admin_users` | CRM staff (PK = `auth.users.id`) | `role` ∈ super_admin/admin/staff, `is_active` |
| `service_categories` | Catalog taxonomy | `slug` uniq, `icon` (lucide name), `sort_order` |
| `cities` | Cities served | `name` uniq, `is_active` |
| `services` | Catalog + content | `slug` uniq, `price numeric`, `price_unit`, `display_price_label`, jsonb: `gallery_imgs/what_we_clean/how_it_works/whats_included/not_included/faqs`, `related_service_ids uuid[]`, `is_active` |
| `price_history` | Price audit | `old_price/new_price`, `changed_by → admin_users` |
| `customers` | Booking customers | `phone` **uniq** (upsert key), `email`, `city` |
| `addresses` | Saved addresses | `customer_id`, `label`, `is_default` |
| `vendors` | Field partners | `status` pipeline, `services_offered uuid[]`, `commission_rate`, `documents jsonb[]`, `onboarded_at` |
| `orders` | Bookings | `order_number` uniq (auto), `status`, `payment_status`, `source`, `assigned_vendor_id`, totals |
| `order_items` | Line items | snapshots `service_name/unit_price`, `qty`, `line_total` |
| `invoices` | Billing | `invoice_number` uniq (auto), `status`, `due_date`, `paid_at`, `pdf_url` |

### 3.3 Status enumerations (CHECK constraints; typed as unions in `@prime/shared`)

- order.status: `pending → confirmed → vendor_assigned → in_progress → completed | cancelled`
- order.payment_status: `unpaid | paid | refunded | partial`
- vendor.status: `pending → approved → active | suspended | rejected`
- invoice.status: `draft → sent → paid | overdue | void`
- order.source: `website | crm | phone`

### 3.4 Triggers & functions

| Object | Type | Behavior |
|---|---|---|
| `set_updated_at()` | trigger fn | sets `updated_at=now()` on `services`, `orders` UPDATE (`search_path=''`) |
| `gen_order_number()` | BEFORE INSERT `orders` | fills `PHC-YYYYMMDD-####` from a sequence (SECURITY DEFINER; REST EXECUTE revoked) |
| `gen_invoice_number()` | BEFORE INSERT `invoices` | fills `INV-YYYY-####` (same pattern) |
| `is_admin()` / `is_super_admin()` | SQL, SECURITY DEFINER stable | RLS predicates; bypass `admin_users` RLS (owner) → no recursion |
| `create_booking(...)` | plpgsql, SECURITY DEFINER | public booking write path (§5.2) |

### 3.5 Indexes

FK/filter indexes on `services(category_id, is_active)`, `orders(status, customer_id, assigned_vendor_id, scheduled_date)`, `order_items(order_id, service_id)`, `invoices(order_id, status)`, `price_history(service_id)`, `addresses(customer_id)`, `vendors(status)`. Uniques: `services.slug`, `customers.phone`, `orders.order_number`, `invoices.invoice_number`, `cities.name`, `service_categories.slug`.

---

## 4. Security & RLS design

**Principle:** anon (website) may READ the active catalog and WRITE bookings **only** via
`create_booking()`. Authenticated admins do everything else, gated by `is_admin()`.

### 4.1 Policy matrix

| Table | anon | authenticated admin |
|---|---|---|
| services | SELECT where `is_active` | ALL (`is_admin()`) |
| service_categories | SELECT (all) | ALL |
| cities | SELECT where `is_active` | ALL |
| customers / orders / order_items | **none** (write via RPC only) | ALL |
| addresses / vendors / invoices / price_history | none | ALL |
| orders / order_items (vendor) | — | SELECT where `assigned_vendor_id = current_vendor_id()` (0010; app reads via `my_jobs()`) |
| admin_users | none | SELECT own-or-admin; ALL for **super_admin** |

> **Deliberate deviation from the brief:** the brief granted anon raw `INSERT` on
> customers/orders/order_items. We do **not** — anon has no `SELECT` policy, so
> `INSERT … RETURNING` (needed to link items to the new order) would be denied, and raw
> insert would allow tampered totals. The `create_booking()` RPC is the single, validated door.

### 4.2 Service-role usage

Only `apps/crm/lib/supabase/admin.ts` (`createAdminClient`), imported solely by the
super-admin-gated Settings action `inviteAdmin` to call `auth.admin.createUser`. The key is
`SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` → never in a client bundle).

### 4.3 Hardening (migration 0003, from `get_advisors`)

- `set_updated_at` given a fixed `search_path`.
- `gen_order_number`/`gen_invoice_number` — REST `EXECUTE` revoked from anon/authenticated
  (trigger-only; triggers still fire). Verified anon `POST /rpc/gen_order_number` → 404, booking still works.
- Remaining advisories (`create_booking`, `is_admin`, `is_super_admin` executable) are intentional/required.

---

## 5. Request flows (sequence)

### 5.1 Auth (CRM)

```
/login (client) → supabase.auth.signInWithPassword(email,pw)
   → query admin_users(is_active) for the user
      → not active/none → signOut + error (never reaches /dashboard)
      → ok → router.replace('/dashboard')
proxy.ts (middleware): refresh session; /dashboard/* requires user else →/login; /login with user →/dashboard
dashboard/layout.tsx (server gate): getUser → admin_users role/active
   → not admin → /not-authorized (client sign-out; breaks redirect loop)
```

### 5.2 Public booking — `create_booking()`

```
cart-drawer.handleSubmit → createPublicClient().rpc('create_booking', {
  p_name,p_phone,p_email,p_city,p_address,p_scheduled_date,
  p_items:[{service_id, qty}], p_notes })

create_booking (SECURITY DEFINER):
  validate name/phone/items
  upsert customers ON CONFLICT(phone)                → customer_id
  insert orders (status=pending, source=website)     → order_number (trigger)
  for each item: SELECT services WHERE id & is_active → re-price line_total = price*qty
                 insert order_items (snapshot)        ; accumulate subtotal
  update orders.subtotal/total
  return { order_id, order_number }
```
Client prices are **ignored**; server re-prices from the live catalog. Returns the human order number for the success screen.

### 5.3 Manual order (CRM) — `createManualOrder`

Authenticated admin action: upsert customer by phone → re-price items from `services` →
insert order (status=confirmed, source=crm) → insert order_items → redirect to detail.

### 5.4 Vendor assignment

Order detail (server) computes **eligible vendors** = `vendors` where `status='active'`
AND `city = order.city` AND `services_offered` **overlaps** the order's service ids
(`.overlaps(...)`). `assignVendor(orderId, vendorId)` sets `assigned_vendor_id` + status `vendor_assigned`.

### 5.5 Invoicing

`createInvoiceFromOrder(orderId)`: guard existing → copy order totals → insert invoice
(status=draft, due +7d, `invoice_number` via trigger). `markInvoicePaid(id, method)` sets
invoice paid + `paid_at` **and** flips the linked order's `payment_status=paid`. Print via `window.print()` (chrome hidden by `@media print`).

### 5.7 KYC review (CRM ↔ partner app)

Partner uploads to the private `vendor-docs` bucket (`<vendor_id>/<doc_type>.<ext>`, one row
per type in `vendor_documents`, UNIQUE (vendor_id, doc_type)) → `submit_vendor_for_review()`
sets `onboarding_step='review'`, `submitted_at`, and (0011) `status='pending'` so a
resubmission re-enters the queue. CRM vendor detail mints **signed URLs server-side under the
admin's own session** (storage RLS "admin read vendor-docs"; no service role) and renders the
KYC panel: per-document **Verify** / **Send back (note)** → `reviewDocument` (sets
`reviewed_by = auth.uid()`, i.e. `admin_users.id`); decision **Approve & activate** /
**Approve only** / **Reject (reason)** / **Suspend** → `decideVendor`. Approve/activate is
guarded: all four required documents must be `verified` (the board's raw status dropdown
stays as the override). Reject writes `rejection_reason`, which the app shows; the partner
may delete a `rejected` document (0011 policy) and re-upload, then resubmit. The vendors
board shows onboarding step, "Review needed", and pending-document counts per card.

### 5.8 Job assignment push (CRM → partner phone)

`assignVendor` (CRM server action) → `notifyVendorOfAssignment(supabase, orderId, vendorId)`
(`apps/crm/lib/push.ts`) → POST https://exp.host/--/api/v2/push/send with the vendor's
`expo_push_token` (0012). Best-effort: a push failure never rolls back the assignment;
`DeviceNotRegistered` clears the token. The app stores its token via
`register_push_token(p_token)` (SECURITY DEFINER, validates the ExponentPushToken[…]
shape, `''` clears on sign-out) and, on a received push, refreshes `my_jobs()`; on tap it opens
that job. Remote push is unavailable in Expo Go on Android (SDK 53+) — a development build
with an EAS project id is required; the app detects both cases and skips registration.

### 5.6 Staff invite (super_admin)

`inviteAdmin` → `requireSuperAdmin()` → service-role `auth.admin.createUser({email_confirm})`
→ insert `admin_users` row → returns a temporary password to display.

---

## 6. Application design

### 6.1 CRM (`apps/crm`)

Shell: `app/dashboard/layout.tsx` (server gate) → `components/crm-shell.tsx` (client:
role-filtered sidebar, mobile drawer, sign-out). Supabase clients:
`lib/supabase/{client,server,middleware,admin}.ts`. Route protection: `proxy.ts`.

| Module | Route(s) | Server actions | Key components |
|---|---|---|---|
| Dashboard | `/dashboard` | — | `dashboard/charts.tsx` (recharts) |
| Services | `/dashboard/services[/new,/[id]]` | create/update/toggle/delete + price_history | `service-form`, `services-table` |
| Orders | `/dashboard/orders[/new,/[id]]` | createManualOrder, updateOrderStatus, updatePaymentStatus, assignVendor | `orders-table`, `order-detail`, `manual-order-form` |
| Customers | `/dashboard/customers[/[id]]` | — (read) | `customers-table` |
| Vendors | `/dashboard/vendors[/new,/[id]]` | createVendor, updateVendor, updateVendorStatus | `vendors-board` (kanban), `vendor-form` |
| Invoices | `/dashboard/invoices[/new,/[id]]` | createInvoiceFromOrder, updateInvoiceStatus, markInvoicePaid | `invoices-table`, `invoice-view`, `generate-button` |
| Settings | `/dashboard/settings` (super_admin) | addCity/toggleCity, addCategory, inviteAdmin, toggleAdminActive | `settings/managers` |

Pattern: **server components** fetch (RLS via session) and map DB rows → view models;
**client components** render + call **server actions** for mutations (`revalidatePath` +
optimistic UI + `sonner`). Role gating in the sidebar; hard gate for Settings in its page.

### 6.2 Website (`apps/web`)

- `lib/supabase/public.ts` — stateless anon client.
- `lib/services-data.ts` — `getAllServices`, `getServiceBySlug`, `getRelatedServices`,
  `getServiceCategories`, `getAllServiceSlugs` (maps DB → the pages' `Service`/`HomeService`).
- `app/page.tsx` — server component (ISR `revalidate=300`) → `components/home-client.tsx`.
- `app/services/[slug]/page.tsx` — SSG via `generateStaticParams()` from DB; passes real
  service `id` to the cart so `create_booking` receives uuids.
- Cart id = **service uuid** (so `p_items[].service_id` is valid).

---

### 6.3 Partner app (`apps/partner`, Expo)

Standalone npm project (Metro cannot follow pnpm's symlinked store). Email + password
sign-in, no confirmation email (see app README for the Supabase toggle). Linear onboarding
wizard driven by `vendors.onboarding_step`; once `status ∈ {approved, active}` the app
switches to a three-tab workspace — Jobs (open work bucketed Overdue/Today/Upcoming,
detail with Call / Maps / Start / Complete), History (finished jobs, count, this month's
value), Account (profile edit via `upsert_my_vendor_profile`). No router: tab + selected
job live in state. One `my_jobs()` list feeds every tab; refreshed on pull, foreground and
after each write. KYC uploads go to the private `vendor-docs` bucket under
`<vendor_id>/…` (storage RLS by folder).

## 7. Contracts

### 7.1 RPC

```
create_booking(p_name text, p_phone text, p_email text, p_city text, p_address text,
               p_scheduled_date date, p_items jsonb, p_notes text) → jsonb
  p_items = [{ "service_id": uuid, "qty": int }]
  returns { order_id: uuid, order_number: text }
  errors: 'No items…', 'Name and phone are required', 'Service <id> is not available'
```

**Vendor job RPCs (0010, `authenticated` only, SECURITY DEFINER):**

| RPC | Returns | Behavior |
|---|---|---|
| `my_jobs()` | table: order fields + `customer_name/phone` + `items jsonb` | Orders where `assigned_vendor_id = current_vendor_id()`, newest scheduled first, limit 200. Customers table stays closed to vendors. |
| `update_my_job_status(p_order_id, p_status, p_cash_collected=false)` | void | Only `vendor_assigned→in_progress` and `in_progress→completed`, on own jobs, vendor must be active/approved. On completion with cash collected and `payment_status='unpaid'`: sets `paid` / `payment_method='cash'`. |

### 7.2 Server actions (all return `{ ok: true } | { error: string }`, admin-session authorized)

`services`: `createService(input)` `updateService(id,input)` `toggleServiceActive(id,bool)` `deleteService(id)` ·
`orders`: `createManualOrder(input)` `updateOrderStatus(id,status)` `updatePaymentStatus(id,status)` `assignVendor(id,vendorId)` ·
`vendors`: `createVendor(input)` `updateVendor(id,input)` `updateVendorStatus(id,status)` ·
`invoices`: `createInvoiceFromOrder(orderId)` `updateInvoiceStatus(id,status)` `markInvoicePaid(id,method)` ·
`settings` (super_admin): `addCity` `toggleCity` `addCategory` `inviteAdmin`→`{ok,password}` `toggleAdminActive`.

---

## 8. Shared package & types

`@prime/shared`: **generated** `Database` type (`supabase gen types`, includes the
`__InternalSupabase` marker so supabase-js infers row types), plus hand-maintained union
enums (OrderStatus…), jsonb shapes (`HowItWorksStep`, `Faq`, `VendorDocument`), row aliases
(`Service`, `Order`…), and `formatINR`/`priceLabel`. Consumed via `transpilePackages`.

---

## 9. Config & deployment

Env (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both apps);
`SUPABASE_SERVICE_ROLE_KEY` (CRM server + seed only). Deploy target: two Vercel projects,
one Supabase backend. Private Storage buckets `vendor-docs` / `invoices` are a documented follow-up.

---

## 10. Non-functional notes

- **Money**: `numeric(10,2)` in DB; `number` in app; formatted via `formatINR`. Server re-prices bookings.
- **Numbering**: DB triggers (no client involvement), collision-free via sequences.
- **Freshness**: website catalog on 5-min ISR; on-demand revalidation is a follow-up.
- **Type checking**: clean. Neither `next.config.mjs` sets `ignoreBuildErrors`, and
  `pnpm typecheck` (`tsc --noEmit` in both apps) passes; `apps/partner` typechecks separately
  via `npm --prefix apps/partner run typecheck`.

---

## 11. Test evidence (2026-07-08)

E2E pass (21 assertions): anon reads active catalog only; anon blocked from orders/customers/
vendors/invoices/admin_users; anon booking via RPC works, direct order insert 401,
`gen_order_number` 404; admin reads all; vendor eligibility overlap correct (respects `status`);
order/invoice numbering triggers; mark-paid → order sync; both apps serve; advisors hardened.

## 12. Known follow-ups

**Open**

- **CRM document review UI** — `vendor_documents` and the `vendor-docs` bucket have admin RLS,
  but `apps/crm` has no screen to verify/reject a partner's documents. Until it exists,
  approving a partner is a manual dashboard/SQL step, and nothing ever writes
  `vendors.rejection_reason` that the partner app reads back.
- Storage-backed uploads for **service images** (vendor docs: done, migration 0009).
- On-demand ISR (CRM→site instant) · Realtime order board.
- Push notifications to the partner app on approval/rejection.
- Enable Auth leaked-password protection (dashboard toggle).

**Closed**

- ~~Storage-backed uploads (vendor docs)~~ — migration 0009, consumed by `apps/partner`.
- ~~Remove `ignoreBuildErrors`~~ — neither app sets it; `pnpm typecheck` is clean.

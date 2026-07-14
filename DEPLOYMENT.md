# Deployment Guide — Vercel + Supabase

Two Vercel projects, one Supabase backend.

| App | Root Directory | Suggested domain |
| --- | --- | --- |
| `apps/web` (marketing + booking) | `apps/web` | `myprimecompany.in` |
| `apps/crm` (internal console) | `apps/crm` | `crm.myprimecompany.in` |

---

## 1. ⚠️ Enable Google OAuth (REQUIRED — do this first)

The website now **requires sign-in to place a booking**. Until Google is enabled in
Supabase, the "Continue with Google" button will fail.

### 1a. Google Cloud Console
1. Go to <https://console.cloud.google.com/> → create/select a project.
2. **APIs & Services → OAuth consent screen** → External → fill app name, support email, developer email → Save.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → *Web application*.
4. Under **Authorized redirect URIs** add exactly:
   ```
   https://wsdmfleivhzyeqsmojgm.supabase.co/auth/v1/callback
   ```
5. Copy the **Client ID** and **Client Secret**.

### 1b. Supabase
1. **Authentication → Providers → Google** → toggle **Enabled**.
2. Paste the Client ID + Client Secret → Save.
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://your-production-domain.com`
   - **Redirect URLs** (add all of these):
     ```
     https://your-production-domain.com/auth/callback
     http://localhost:3000/auth/callback
     ```
4. Keep **"Enable email signups" OFF** — the CRM is admin-only and provisioned by a super admin.

---

## 2. Environment variables

### `apps/web` (Vercel project 1)
| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wsdmfleivhzyeqsmojgm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
| `NEXT_PUBLIC_SITE_URL` | *(optional)* custom domain, e.g. `https://www.myprimecompany.in` |

> The web app uses the **anon key only**. Never add the service-role key here.

`NEXT_PUBLIC_SITE_URL` only drives canonical/OG tags and `sitemap.xml`. Leave it
unset and it falls back to Vercel's auto-injected production URL; set it once a
custom domain is live.

**Both Supabase vars are required at BUILD time** — the service catalog is
prerendered. If either is missing the build fails immediately with an explicit
message rather than deploying a broken site.

### `apps/crm` (Vercel project 2)
| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wsdmfleivhzyeqsmojgm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key (**server-only**, for staff invites) |

Set each for **Production, Preview and Development**.

> **The CRM fails closed.** If it is deployed without the Supabase vars it throws
> instead of serving `/dashboard`. That path used to fall through to an
> unauthenticated shell — fine for `next dev` on localhost, a wide-open admin
> console on a real domain.

---

## 3. Vercel project settings (both apps)

This is a **pnpm workspace monorepo**, so each Vercel project points at a sub-directory:

- **Framework Preset**: Next.js
- **Root Directory**: `apps/web` (or `apps/crm`) — tick *"Include files outside the root directory"*
- **Install Command**: leave default. Vercel detects the pnpm workspace and runs
  `pnpm install --frozen-lockfile` from the repo root. `pnpm-lock.yaml` is
  committed and verified in sync — an out-of-sync lockfile is the single most
  common cause of a failing Vercel build on a pnpm monorepo.
- **Build Command**: leave default (`pnpm build`, run inside the root directory)
- **Node.js Version**: 20.x or later

Each app ships a [`vercel.json`](apps/web/vercel.json) that pins the framework,
sets the serverless region to **`bom1` (Mumbai)** — the default is US-East, which
would add ~250 ms to every request from India — and applies security headers.

Two details worth knowing before you edit them:

- **web** sends `Permissions-Policy: geolocation=(self)`. Tightening this to
  `geolocation=()` silently breaks "Detect my location".
- **crm** sends `X-Robots-Tag: noindex, nofollow` and serves a `Disallow: /`
  robots.txt, so the admin console never lands in a search index.

---

## 4. Database

The schema, RLS, seed data and all functions are already applied to the live project.
Migrations are tracked in [`supabase/migrations/`](supabase/migrations/):

| Migration | Purpose |
| --- | --- |
| `0001_schema.sql` | Tables, triggers, auto-numbering, indexes |
| `0002_rls.sql` | RLS policies, `is_admin()`, `create_booking()` |
| `0003_security_hardening.sql` | Advisor fixes (search_path, revoked RPC grants) |
| `0004_web_auth_and_partner_applications.sql` | `customers.auth_user_id`, auth-required booking, `submit_vendor_application()` |
| `0005_catalog_taxonomy.sql` | 7 service categories + 1/2/3/4 BHK packages |

For a **fresh** Supabase project, run `supabase/apply-all.sql`, then `pnpm seed` and
`pnpm bootstrap` (see [`supabase/README.md`](supabase/README.md)).

---

## 5. Post-deploy checklist

- [ ] Google sign-in works on the deployed domain (not just localhost).
- [ ] Booking end-to-end: add to cart → sign in → confirm → order number returned.
- [ ] The order appears in the CRM under **Orders** with `source = website`.
- [ ] "Become a Partner" submission appears in the CRM under **Vendors** as `pending`.
- [ ] "Detect my location" prompts for permission and selects the nearest city.
- [ ] CRM `/login` works and `/dashboard` redirects when signed out.
- [ ] `https://<web>/sitemap.xml` lists the service pages; `https://<crm>/robots.txt` says `Disallow: /`.
- [ ] Turn on **Auth → Leaked password protection** in Supabase (flagged by the advisor).

---

## 6. Custom domains

Add the domain in each Vercel project, then update Supabase
**Authentication → URL Configuration** with the production `Site URL` and the
`/auth/callback` redirect URL. Sign-in will fail on any domain not listed there.

# MyPrimeCompany — Partner app (Expo / React Native)

Self-onboarding for service partners: sign in, claim a vendor record, pick
services, upload KYC documents, submit for review.

This app is the missing client for the vendor-onboarding schema that already
existed in the database (`supabase/migrations/0008_vendor_app_onboarding.sql`
and `0009_vendor_docs_storage.sql`).

## Why this is not a pnpm workspace package

`pnpm-workspace.yaml` excludes `apps/partner`. Expo's Metro bundler resolves
modules by walking real directories, which pnpm's symlinked store breaks without
`node-linker=hoisted` — and switching the linker would re-link all 532 packages
the two Next.js apps depend on. So this is a standalone npm project.

**Run npm from inside `apps/partner`, never pnpm from the repo root.**

The cost: it cannot import `@prime/shared`. The slice of the schema it needs is
hand-maintained in [`src/lib/types.ts`](src/lib/types.ts) — keep it in sync with
migration 0008.

## Setup

```bash
cd apps/partner
npm install
cp .env.example .env      # then fill in the Supabase URL + anon key
npx expo start
```

Press `a` for Android, `i` for iOS, or scan the QR with Expo Go.

`EXPO_PUBLIC_*` is inlined by Metro at bundle time. After editing `.env`,
restart with `npx expo start -c` or the old value stays baked in.

## Styling

NativeWind (Tailwind for RN) with shadcn-style primitives in
`src/components/ui/` — cva variants on RN primitives, the react-native-reusables
pattern. Design tokens in `tailwind.config.js` mirror
`packages/shared/styles/theme.css` (converted oklch → hex; RN has no oklch).
Same token split as the web apps: `primary` is brand blue, `brand` is the orange
CTA, `accent` is a neutral press tint. App-level composites (`Screen`, `Field`,
`Steps`, …) live in `src/components/ui.tsx`.

## Auth

Email + password, **no verification email** — for now. Email delivery on the
stock Supabase sender (OTP codes, magic links) is capped at ~2 emails/hour and
often dropped by Gmail, so nothing in sign-in depends on an inbox. One button
signs in, or creates the account and signs in immediately if the email is new.

That instant sign-up needs **"Confirm email" switched OFF** in Supabase →
Authentication → Providers → Email. With it on, sign-up returns no session and
the screen says so.

Google OAuth — which `apps/web` uses — needs native client IDs per build, and
phone OTP needs a paid SMS provider. The magic-link plumbing is kept for later:
`App.tsx` still listens for deep links via `expo-linking` and
`createSessionFromUrl` handles them (also what a password-reset link will
need). To use it, add these to Authentication → URL Configuration → Redirect
URLs — `exp://<pc-lan-ip>:8081/**` (Expo Go) and `primepartner://**` (store
builds) — and `node scripts/dev-magic-link.mjs <email>` mints a test link.

The phone number is still the partner's identity: it is collected on the claim
screen, and `claim_vendor()` matches it against unclaimed vendor rows so a
"Become a Partner" application from the website is adopted rather than
duplicated.

## Flow

The wizard position lives in `vendors.onboarding_step`, not in navigation state,
so reinstalling the app resumes exactly where the partner left off. `App.tsx`
derives the screen from the vendor row — there is no router.

| Step | Screen | Writes via |
| --- | --- | --- |
| — | `SignInScreen` | `supabase.auth` email + password (no confirmation email) |
| — | `ClaimScreen` | `claim_vendor()` → creates/adopts the vendor row |
| `profile` | `ProfileScreen` | `upsert_my_vendor_profile()` → advances to `documents` |
| `documents` | `DocumentsScreen` | Storage upload + `vendor_documents` insert |
| `review` / `done` | `StatusScreen` | `submit_vendor_for_review()` |

## Documents

Four are mandatory — Aadhaar, PAN, address proof, bank proof — enforced by
`submit_vendor_for_review()`, which raises if any is missing. Police
verification and photo are optional. `REQUIRED_DOCS` in `src/lib/types.ts` must
stay identical to the array in that function.

Files go to the **private** `vendor-docs` bucket at `<vendor_id>/<doc_type>.<ext>`.
The path prefix is load-bearing: the storage RLS policy authorises on
`(storage.foldername(name))[1] = current_vendor_id()`, so a partner can only ever
read and write inside their own folder.

Upload order is storage first, then the `vendor_documents` row. A failure after
the upload leaves an orphan object (harmless — overwritten on retry); the
reverse would leave a row pointing at nothing, which would satisfy the
submit-time presence check with no actual document behind it.

## What is not built yet

- **CRM review UI.** Admins can read `vendor_documents` and the bucket via
  existing policies, but `apps/crm` has no screen for approving or rejecting
  documents. Until that exists, verification is a manual SQL/dashboard job.
- **Push notifications** on approval or rejection.
- **Job feed.** This app covers onboarding only; an approved partner sees a
  status screen, not their assigned orders.

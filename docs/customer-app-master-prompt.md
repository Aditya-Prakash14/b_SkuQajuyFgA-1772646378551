# MyPrimeCompany App — Master Prompt v2: Completion

Finish the **MyPrimeCompany customer app** (`apps/customer`, Expo SDK 54 / React Native 0.81 / Supabase) so a customer in Bangalore can book, track, pay for and rate both business lines end-to-end, and the app can ship to the Play Store and App Store.

This is a *completion* prompt, not a greenfield one. The 24-screen app from the v1 prompt is built and runs on the live database. Everything below was written after reading every file in the monorepo and checking the live schema, so the "what exists" sections are facts, not assumptions. Where the v1 prompt described things that do not exist (Clerk, a `payments` table, `helper_locations`, `en_route` status), this prompt replaces them with what is actually there.

Written 23 Aug 2026 against branch `feat/customer-app` at commit `01bf0cf`, Supabase project `wsdmfleivhzyeqsmojgm`, migration `0028`. **Executed the same day through Phase 4 — see "Progress" below; the database is now at migration `0032`.**

---

## Progress (23 Aug 2026, same day)

The phases below were then executed against this prompt. Every item was typechecked, bundled and, where it touches the database, verified live. Branch `feat/customer-app`, **still unpushed**.

| Phase | Status | Where | What landed |
| --- | --- | --- | --- |
| 0 | done | `01bf0cf`, 0028 | §3 |
| 1 | **done** | `d566671`, 0029 | Reschedule with a timeline entry · address book (add / edit / delete / default) with pickers in checkout and Prime Now · helper card via `my_booking_helper()` (name, rating, call while live) · service detail renders gallery, what we clean, how it works, not included, FAQs, reviews via `public_reviews` · book again at today's prices · the website's "Any time — we'll confirm on call" window · Prime Now asks for an hour · `p_source = 'app'` on both intake RPCs · home search · `per_seat` · seven FAQs with the §11 defaults, Terms / Privacy links · offline cache + banner, cleared on sign-out · reduce-motion, labels · hardening: qty cap 20, `dispatch_*` refuse non-admin callers, `customers` direct UPDATE limited to name / email / city, push token clearable and validated, `reviews` hides `customer_id` / `order_id` / `tip_amount` from anon, `my_stats()` pays tips out |
| 2 | **done, except `eas init`** | `bb4984f`, 0030 | `en_route_at` on both tables, `mark_en_route()`, partner "On my way" button, `my_jobs()` returns it · `notify-customer` edge function (deployed v1) fed by `pg_net` from triggers on `booking_events` and `prime_now_requests`; the shared secret lives in Vault and is compared through `notify_secret()` (service role only) · app registers for push only after a tap, saves the token, clears it on sign-out, a tapped push opens the booking · "Helper on the way" step in both timelines. Verified end to end: test event → trigger → function → `200 {"sent":false,"reason":"silent-event"}`. **Until `eas init` runs in both apps no device can get a token — that is the owner's Expo account.** |
| 3 | **groundwork done** | `c54d43f`, 0031 | `payments` ledger, written by a trigger whenever `payment_status` flips to paid (cash checkbox, CRM mark-paid, future webhook) · `paid_at`, `cancelled_at` / `cancelled_by` / `cancellation_reason`; both cancel RPCs record the customer · `invoices` own-row SELECT + private `invoices` bucket with per-customer folders · Receipt screen (GST split, share, opens the CRM invoice PDF by signed URL). **Needs Razorpay keys:** `razorpay-create-order`, `razorpay-webhook`, "Pay now", tips charged online, refunds through the API. |
| 4 | **partly done** | `db7f005`, 0032 | `delete_my_account()` + `delete-account` edge function (deployed, JWT-verified) + Account "Delete account" with two confirmations · `eas.json` · app / universal link config, `OpenBooking` / `OpenOrder` routes and the navigator's `linking` · `track()` with the event names below, wired at 13 points, console in dev, `setAnalyticsProvider()` for the real one · Apple sign-in written behind `APPLE_SIGN_IN_ENABLED = false` · release-safe sign-in error copy. **Needs the owner's accounts:** `eas init` and builds; Apple provider in Supabase, then flip the flag; an SMS provider, then `PHONE_OTP_ENABLED`; a PostHog / Amplitude project; Sentry; EAS Update; the website's `.well-known/assetlinks.json` and `apple-app-site-association`; store assets. Deliberately skipped: the i18n string extraction — a large mechanical refactor with no user value until Hindi is decided (§11). |
| 5 | not started | — | Waits on §11. |

---

## 0. Standing rules

These held for the whole project and still hold. Breaking any of them has already cost a day at least once.

1. **Never push without the owner's approval.** Commit freely on `feat/customer-app`; ask before `git push`.
2. **Database changes are a migration file in `supabase/migrations/NNNN_*.sql` AND applied live.** Apply with the Supabase MCP `apply_migration` (same SQL), then verify with a query. The next number is `0033`.
3. **Changing a function's signature means `drop function` first, then `create`.** `create or replace` with an added parameter creates a *second overload* and every existing caller dies with `PGRST203 Could not choose the best candidate function`. This happened in 0022 and again nearly in 0026.
4. **Every RPC a customer calls is `SECURITY DEFINER`, `set search_path = public, pg_temp`, `revoke … from public, anon`, `grant … to authenticated`** unless anon access is the point (Prime Now intake).
5. **`supabase.realtime.setAuth(token)` on every auth state change** — already wired in `src/lib/supabase.ts`. Without it channels subscribe and deliver nothing.
6. **`apps/customer` is an npm project, not pnpm.** `cd apps/customer && npm install`. It cannot import `@prime/shared`; the schema slice lives in `src/lib/types.ts` and the status unions must stay byte-identical to `packages/shared/src/database.types.ts`.
7. **Expo SDK 54, not 57.** The owner's Expo Go is 54.0.8. `apps/customer/AGENTS.md` says to read the v57 docs — that note predates the pin; ignore it until the owner upgrades Expo Go.
8. **Expo Go cannot do remote push, maps, or Razorpay's native SDK.** Those need a development build (`eas build --profile development`). Detect and degrade; never crash in Expo Go.
9. **Every colour goes through a token.** `className` tokens from `global.css` for anything styleable; `useColors()` from `src/lib/theme.ts` for native props. Dark mode exists; a literal hex breaks it.
10. **Copy rules:** plain, factual, sentence case, no exclamation marks, no emoji, no invented statistics. Keep the company's lines verbatim: "Not happy? We will come back and re-clean at no extra cost", "Verified Professionals", "Eco-Friendly Products", "On-Time Service". Call the person who comes a *helper* in the app (see §8).
11. **Server prices, client displays.** The app never computes a price the server does not re-derive. `create_booking` and `create_prime_now_request` ignore client amounts.
12. **Run `npx tsc --noEmit` (must be 0 errors) and rebundle before every commit.** Metro is usually on port 8082: `npx expo start --clear --port 8082`.

---

## 1. Business context (current)

| | |
| --- | --- |
| Brand | MyPrimeCompany (site title "My Prime Company") |
| Live site | **https://www.myprimecompany.com** — the `.in` domain does not resolve; catalogue images are served from `.com` |
| Email | support@myprimecompany.in |
| Phone / WhatsApp | +91 73496 03429 · wa.me/917349603429 |
| Registered office | HSR Layout Sector 4, 17th Main B Cross, Bangalore, Karnataka 560102 |
| Cities live in the database | **Bangalore only.** The website hard-codes 12 cities in `apps/web/lib/cities.ts`; the app reads `cities` and is correct to. |
| Claims the business publishes | 1M+ customers served · 4.8 average rating · corporate clients Viatris, Mylan, Laurus Bio, Prime Eagle |

### The two domains

**Domain 01 — Deep Cleaning.** Scheduled, flat-priced, GST-inclusive, paid after the work by cash or UPI. "From ₹1,499". Booked through a cart → date + arrival window → `create_booking()`. Three-level drill-down: categories → services in a category → service detail. Per-unit services (per sq ft / per panel) ask for the area first and are quoted, then measured on site.

**Domain 02 — Prime Now.** Instant house help by the hour, no catalogue. Four slots, flat, no travel charge, no surge:

| slot id | label | price | minutes |
| --- | --- | --- | --- |
| `30m` | 30 minutes | ₹199 | 30 |
| `1h` | 1 hour | ₹349 | 60 |
| `90m` | 90 minutes | ₹499 | 90 |
| `half_day` | Half day · 4 hours | ₹1,199 | 240 |

These rates are **live and enforced server-side** (a literal table inside `create_prime_now_request`, migration 0024) *and* still flagged by the business as drafts. Changing them is a migration, not a config edit.

The request is dispatched automatically: insert → trigger → `dispatch_prime_now()` → offers to up to 5 online, active, `accepts_prime_now` partners in the same city, expiring in 2 minutes → first `accept_offer()` wins → status `dispatched` → partner starts (`in_progress`) → completes. `pg_cron` runs `escalate_offers()` every minute for 6 hours. No human is required, and the CRM queue (`/dashboard/prime-now`) can override at any point.

### Guarantees (verbatim, use as-is)

- Background-verified helper — "Every helper is ID-checked before their first job."
- Flat hourly price — "You pay the slot price. No travel fee, no surge."
- Helper brings supplies — "Cloths, brushes and basic cleaning liquid are included."
- Free re-visit if unhappy — "Not happy? We will come back and re-clean at no extra cost."

### Live catalogue (20 active services, 7 categories)

Home Deep Cleaning: Home Deep Cleaning ₹1,499 · 1 BHK ₹2,499 · 2 BHK ₹3,499 · 3 BHK ₹4,499 · 4 BHK / Villa ₹5,999
Residential Cleaning: Window Cleaning ₹25 / sq. ft. · Curtain Cleaning ₹99 / panel · Carpet Shampooing ₹499 / sq. yd. (`per_sqft`) · Bathroom ₹599 · Mattress ₹699 · Sofa Shampooing ₹799 · Kitchen ₹899
Corporate & Commercial: Exterior Cleaning ₹5 / sq. ft. · Office Deep Cleaning ₹2,999
Pest Control: General ₹999 · Bed Bugs ₹1,999 · Termite ₹2,499
Marble & Floor Polishing ₹3 / sq. ft. · Painting ₹7 / sq. ft. · Disinfection ₹1,299

The v1 prompt's "4 categories, 9 services" is out of date; the app reads the live catalogue and needs no change for this. `price_unit` can also be `per_seat`; the app's `unitWord()` falls back to "sq. ft." for it — fix in Phase 1.

### Live data at the time of writing

19 orders (12 pending, 4 confirmed, 1 vendor_assigned, 2 completed; 16 from the website, 3 from the CRM; 15 unpaid) · 11 Prime Now requests (7 new, 3 dispatched, 1 completed; **10 of 11 have no `customer_id`** because they came from the website anonymously) · 13 customers (5 with a sign-in) · 4 active partners (1 online) · 0 reviews · 4 addresses.

---

## 2. What exists

### 2.1 Screen status against the v1 prompt

| # | Screen | Status | What is there / what is not |
| --- | --- | --- | --- |
| 1 | Splash | done | Teal, logo, loading bar, "Trusted by 1 million+ customers" |
| 2–4 | Intro ×3 | done | Pager, Skip, Back; photo panels are placeholders — no marketing images bundled |
| 5 | Sign in | partial | Email + password (sign-in-or-sign-up) and Google. Phone OTP built but hidden (`PHONE_OTP_ENABLED = false`, no SMS provider). No Apple sign-in. |
| 6 | Verify code | built, unreachable | Six-box OTP input; lit only when phone OTP is on |
| 7 | Profile 1/3 | done | Name, email, phone → `upsert_my_profile`. No avatar. |
| 8 | Address 2/3 | partial | Text + city chips → `save_my_address`. **No map, pin, pincode or lat/lng** — the `addresses` table has none of those columns. |
| 9 | Notifications 3/3 | partial | Three toggles saved via `save_notification_prefs`. **No OS permission request, no push token** — `expo-notifications` is not installed. |
| 10 | Home | partial | Greeting, live-booking card (both domains), two domain cards, rebook strip, trust line, tab bar. **No search**; location chip is not tappable; "From ₹1,499" is hard-coded (matches the website's domain card). |
| 11 | Categories | done | Live counts and "From" price with the unit on its own line |
| 12 | Services in category | done | Add for fixed, "Select" (detail) for per-unit |
| 13 | Service detail | partial | Hero, tagline, description, six "What's included", area input + estimate, sticky bar. **Not rendered though present in the DB:** `what_we_clean`, `how_it_works`, `not_included`, per-service `faqs`, `gallery_imgs`, public reviews. |
| 14 | Prime Now slot | done | |
| 15 | Describe the work | done | 13 task chips + note |
| 16 | When & where | done | Now / schedule (day only, fixed 10:00), saved address, phone, live price |
| 17 | Matching | done | Pulsing log, polls every 4 s, **real cancel (0028)**, ops-cancel reflected, "Track" goes to Bookings |
| 18 | Cart | done | Visit charge removed, "Inclusive of 18% GST", estimate only when a per-unit line exists |
| 19 | Slot & payment | partial | 14-day strip, three windows, UPI/cash *on completion* (label only — nothing is sent to the server). No "Any time — we'll confirm on call" option (the website has it). |
| 20 | Confirmed | done | |
| 21 | Tracking | partial | Timeline from `booking_events` (**live via realtime since 0028**); Prime Now four-step derived timeline; GST split; cancel with confirm, mirroring server rules. **No helper card, no map, no ETA, no reschedule UI.** |
| 22 | Rate & tip | partial | Stars, ₹0/20/50/100, comment → `submit_review(..., p_tip_amount)`. Deep Cleaning only — a Prime Now request has no order to rate. Tip is stored, not charged, and not yet in the partner's payout. |
| 23 | My bookings | done | Both domains, Upcoming/Past (Prime Now statuses now counted as live) |
| 24 | Account | partial | Profile edit, addresses (**read-only list**), notification toggles, appearance, help, office, sign out. No membership purchase, **no delete account, no Terms/Privacy links**. |
| — | Help tab (extra) | done | Call / WhatsApp / email + 5 FAQs (the website has 7; wording differs) |
| — | Dark mode (extra) | done | System / Light / Dark in Account, persisted |

### 2.2 Backend the app can call today

All on project `wsdmfleivhzyeqsmojgm`. Signatures are exact.

| RPC | Callable by | Returns / rule |
| --- | --- | --- |
| `create_booking(p_name, p_phone, p_email, p_city, p_address, p_scheduled_date date, p_items jsonb, p_notes, p_slot)` | authenticated (refuses anon) | `{order_id, order_number}`. `p_items = [{service_id, qty, units}]`. Re-prices from `services`; per-unit needs `units` > 0 and ≤ 100 000; **no qty cap**; writes `subtotal = total/1.18`, `tax`, `total`; files the address; `source = 'website'` always. |
| `create_prime_now_request(p_name, p_phone, p_address, p_city, p_slot, p_tasks text[], p_notes, p_timing, p_scheduled_for)` | anon + authenticated | `{id, request_number, price, minutes}`. Rate limits per phone: 3/hour, 2 open. `customer_id` = caller's customer row or NULL. |
| `cancel_booking(p_order_id)` | authenticated | own order, `pending`/`confirmed` only |
| `reschedule_booking(p_order_id, p_date, p_slot)` | authenticated | own order, `pending`/`confirmed`, future date; **writes no `booking_events` row** |
| `cancel_prime_now_request(p_request_id)` — **0028** | authenticated | own request, `new`/`dispatched` only; supersedes open offers |
| `submit_review(p_order_id, p_service_id, p_rating, p_comment, p_tip_amount)` | authenticated | own completed order; tip 0–5000; upsert per (order, service) |
| `upsert_my_profile(p_name, p_email, p_phone, p_city)` → uuid | authenticated | creates/updates `customers`; phone collision refused; no phone ⇒ sentinel `pending:<uid>` |
| `save_my_address(p_label, p_full_address, p_city, p_is_default, p_name, p_phone)` → uuid | authenticated | insert-only; demotes the old default |
| `save_notification_prefs(p_booking_updates, p_helper_en_route, p_marketing, p_expo_push_token)` | authenticated | null leaves a field alone; **cannot clear the token** |
| `current_customer_id()` | anyone | NULL for anon |

Direct table access under RLS: `services` (active), `service_categories`, `cities` (active), `reviews` (everyone, all columns); own rows of `customers` (select, update), `addresses` (all), `orders` + `order_items` (select), `prime_now_requests` (select, only if `customer_id` set), `booking_events` (select), `notification_prefs` (all). **No path to `vendors`, `job_offers`, `invoices`.**

Realtime publication: `orders`, `prime_now_requests`, `booking_events` (0028). Storage: only the private `vendor-docs` bucket exists. Edge functions: **none** (`supabase/functions/` does not exist). Email/SMS/WhatsApp providers: **none configured**.

### 2.3 What the other apps do that the customer must be told about

- **Partner app** statuses a partner can set: `vendor_assigned → in_progress` ("Start job") `→ completed` ("Mark completed", optional "cash collected" ⇒ `payment_status = 'paid'`, `payment_method = 'cash'`). Nothing else. **There is no "on the way" action, no ETA, no GPS, no photos, no OTP at the door.**
- **CRM** can set any order status from a dropdown (even backwards), assign/unassign a partner, change payment status, manage the Prime Now queue (manual dispatch/assign/status), issue GST invoices and mark them paid (cascades to the order). It cannot edit a booking's date, slot, address or price. Its only customer message is a **manual** prefilled WhatsApp link on the Prime Now queue.
- **Partner push is dead**: `apps/partner/app.json` has no EAS project id, so no token is ever registered and the CRM's assignment push always reports `no-token`.

---

## 3. Fixed in this pass (Phase 0, commit `01bf0cf`, migration 0028)

Listed so the next session does not re-diagnose them.

| Defect | Fix |
| --- | --- |
| Cart added a ₹50 visit charge the server never bills; GST-inclusive pricing was hidden | `VISIT_CHARGE = 0` until the business decides; bill shows "Inclusive of 18% GST"; tracking shows taxable / CGST 9% / SGST 9% |
| Live Prime Now requests sorted into "Past" and were missed by the home card | `isUpcoming` knows `new`/`dispatched` |
| "Cancel request" on the matching screen only navigated away while dispatch continued | `cancel_prime_now_request()` + confirm dialog on both screens |
| Tracking offered Cancel on `vendor_assigned`, which the RPC refuses | `canCancel()` mirrors server rules; otherwise "call us" |
| Tracking subscribed to `booking_events`, which was not in the realtime publication | added + `replica identity full` |
| No Prime Now timeline or live status | derived four-step timeline, realtime on the request row; ops cancel reflected |
| 0027's promised one-default-address index did not exist | created |

---

## 4. Remaining work, by phase

Each item says what to build, where, and when it is done. Phases are sequenced by dependency: Phase 1 needs no new accounts or decisions; Phase 2 needs an EAS project id; Phase 3 needs Razorpay; Phase 4 is release mechanics; Phase 5 waits on §11.

### Phase 1 — Truthful and complete (no new services required) — DONE (`d566671`)

**1.1 Reschedule.** Tracking → "Change date" on `pending`/`confirmed` Deep Cleaning bookings: the same 14-day strip and three windows as checkout, plus "Keep current". Calls `reschedule_booking`. *Migration 0029:* make `reschedule_booking` insert a `booking_events` row (`status = current status`, `note = 'Rescheduled to <date> · <slot>'`) so the timeline records it. Done when: rescheduling from the app shows the new date on the CRM order and a timeline entry in the app.

**1.2 Address book.** Account → Addresses: add (via `save_my_address`), edit and delete (direct `addresses` update/delete under RLS), "Set as default" (demote-then-promote, two writes; the 0028 index makes a second default impossible). Checkout (Slot & payment) and Prime Now (When & where) get "Change" → pick among saved addresses or add one. Home's location chip opens the same picker. Done when: a customer with two addresses can book to the non-default one without editing it.

**1.3 Helper card.** *Migration:* `my_booking_helper(p_kind text, p_id uuid)` SECURITY DEFINER returning `{name, rating, phone}` only when the caller owns the booking and a partner is assigned; phone only while status is `vendor_assigned`/`in_progress` (or `dispatched`/`in_progress` for Prime Now). Never grant a customer a `vendors` SELECT policy — it would expose `commission_rate`, `expo_push_token`, `documents`. Tracking shows name, rating, "Call helper". There is no partner photo column; do not promise one. Done when: after a partner accepts, the customer sees their first name and can call them.

**1.4 Richer service detail.** Render `what_we_clean`, `how_it_works` (`{step,title,desc}[]`), `not_included`, per-service `faqs` (`{q,a}[]`), `gallery_imgs` (horizontal strip; prefix with `imageUrl()`), and public reviews with rating. *Migration:* a `public_reviews` view exposing only `service_id, rating, comment, created_at` and a reviewer first name; revoke the anon `select` on `reviews` itself (the current policy exposes `customer_id`, `order_id` and `tip_amount` to anyone). Done when: the app's service page shows at least as much as the website's.

**1.5 Book again.** Home's "Rebook" and Tracking's completed state re-add that booking's still-active services to the cart (carry `units` for per-unit lines, via `fetchService` for current prices) and open the cart. Done when: one tap from a completed booking lands in a populated cart.

**1.6 Arrival window parity.** Add the website's fourth option "Any time — we'll confirm on call" (send `p_slot` undefined). Keep the three window strings byte-identical to `apps/web/lib/slots.ts`.

**1.7 Prime Now scheduled time.** When "Schedule" is chosen, ask for an hour (chips 8 AM – 8 PM) instead of silently booking 10:00. Send the ISO timestamp in Asia/Kolkata.

**1.8 Source attribution.** *Migration:* `create_booking` gains `p_source text default 'website'` (**drop, then create** the 10-arg function; regrant) and `prime_now_requests` gains a `source` column + parameter. The app passes `'app'`. Done when: the CRM orders table can tell app bookings from website ones.

**1.9 Search.** Home search field filtering the active catalogue (name, tagline, category) loaded once per session; results navigate to the service detail. Prime Now is not searchable — it is a request, not a menu.

**1.10 Unit word.** `per_seat` → "seat" everywhere `unitWord()` is derived (app and website).

**1.11 Copy parity and consistency.** Help tab FAQ = the website's seven homepage questions. The website contradicts itself; pick one answer (see §11) and use it in both: re-clean window 24 h vs 48 h; cancellation "before the professional sets out" vs "12 hours before"; 12 vs 14 cities. Sign-in and Account link to https://www.myprimecompany.com/terms and /privacy.

**1.12 Prime Now for a brand-new account.** `create_prime_now_request` sets `customer_id` from `current_customer_id()`, which is NULL until `upsert_my_profile` has run; the app's setup flow guarantees that, so app requests are linked (verified: PN-20260823-0011). Keep it that way — never let Prime Now be reachable before setup completes.

**1.13 Offline and failure states.** Cache the catalogue and the customer's bookings in AsyncStorage; show "You're offline" with cached data; retry buttons on every fetch error; booking creation requires connectivity and says so.

**1.14 Security hardening the app depends on** (*migration 0029*, all small):
- `dispatch_prime_now` / `dispatch_order` are granted to `authenticated` with no admin check — any signed-in customer can trigger offer waves. Add `if not is_admin() then raise exception` guarded so the trigger and cron paths (which run without a JWT) still work: `if auth.uid() is not null and not is_admin()`.
- `create_booking`: cap `qty` at 20 (the CRM's cap) with a friendly message.
- `save_notification_prefs`: allow clearing the token (`p_expo_push_token = ''` ⇒ NULL, like `register_push_token`), and validate the `ExponentPushToken[...]` shape.
- Narrow the customer's direct UPDATE on `customers` to `name, email, city` (column grants) so the phone-collision rule in `upsert_my_profile` cannot be bypassed into a raw `23505`.

**1.15 Accessibility.** `accessibilityLabel` on every image and icon-only control, 4.5:1 contrast checked in both themes, `reduceMotion` respected on the splash bar and matching pulse.

### Phase 2 — Customer notifications — DONE except `eas init` (`bb4984f`)

Today nothing reaches a customer automatically — no push, email, SMS or WhatsApp. `notification_prefs.expo_push_token` is a column nothing reads.

**2.1 App side.** Install `expo-notifications` + `expo-device`. Step 9 "Allow notifications" and Account → Notifications request the OS permission, then `getExpoPushTokenAsync({ projectId })` → `save_notification_prefs(p_expo_push_token)`. Clear it on sign-out (needs 1.14). Android channel `bookings` (importance high). Foreground handler shows the banner; tapping a notification deep-links to Tracking for that booking (`data: {kind, id}`). Follow `apps/partner/src/lib/push.ts` for the Expo Go guard — the module's top-level import throws in Expo Go on Android.

**2.2 Sender.** Build one Edge Function `notify-customer` (Deno, `supabase/functions/notify-customer`): input `{kind, id, event}`; looks up the booking, the customer's `notification_prefs`, applies the preference gate, POSTs to `https://exp.host/--/api/v2/push/send`, clears the token on `DeviceNotRegistered`. Invoke it from the database with `pg_net` from two triggers: `after insert on booking_events` and `after update of status on prime_now_requests`. (`apps/crm/lib/push.ts` is a working reference for the Expo call.) Secrets live in the function's env, never in SQL.

**2.3 "Helper on the way".** The preference exists; the event does not. Add it without widening `orders.status`: *migration* `orders.en_route_at timestamptz` + `prime_now_requests.en_route_at`, an RPC `mark_en_route(p_job_id)` for the assigned partner, which also inserts a `booking_events` row with `status = 'en_route'` (free text there). Partner app: an "On my way" button between Accept and Start. Customer timeline gains "Helper on the way" between assigned and in progress. Coordinate with whoever owns `apps/partner`.

**2.4 Matrix** — see §6 for every event, gate and copy.

**2.5 Also unblock partner push** — `eas init` in `apps/partner` too; without it Phase 2's Prime Now promise ("a helper is on the way") has no partner to receive the job fast.

### Phase 3 — Payments and receipts — schema, ledger and receipts DONE (`c54d43f`); gateway needs Razorpay keys

**3.1 Schema** (*migration*): `payments` (`id, kind 'deep_clean'|'prime_now', job_id, provider 'razorpay'|'cash'|'upi_manual', method, provider_order_id, provider_payment_id, amount numeric(10,2), currency 'INR', status 'created'|'authorized'|'captured'|'failed'|'refunded', raw jsonb, created_at`), RLS: customer reads own, writes only via functions. Add `orders.paid_at`, `prime_now_requests.paid_at`.

**3.2 Edge functions.** `razorpay-create-order` (authenticated; creates a Razorpay order for an own unpaid booking, inserts `payments` `created`, returns `order_id` + key id). `razorpay-webhook` (verifies `X-Razorpay-Signature`; on `payment.captured` sets `payments.captured`, `orders.payment_status = 'paid'`, `payment_method`, `paid_at`, and inserts a `booking_events` row `note = 'Paid online'`; on `refund.processed` sets `refunded`).

**3.3 App.** Slot & payment gains "Pay now (UPI / card)" alongside "Pay after the work". Razorpay Checkout runs in `expo-web-browser` against a tiny hosted page (so it works in Expo Go) or `react-native-razorpay` in a dev build. Tracking shows "Paid ₹X on <date>" and "Pay now" for unpaid completed bookings. Default stays pay-after until §11 says otherwise.

**3.4 Receipts.** *Migration:* `invoices` SELECT policy for own rows; Edge Function `generate-invoice` renders the GST invoice (the CRM's `invoice-view.tsx` is the template: taxable, CGST 9%, SGST 9%, total) into a new private `invoices` bucket and returns a signed URL; app "Download receipt" on completed bookings. Until the CRM issues an invoice, show an in-app receipt built from the order.

**3.5 Tips.** With online payment, charge the tip at rating time (`payments` row, `kind` the same, `note = 'tip'`). Without it, keep "settled with the helper's earnings" **and** make it true: extend `my_stats()` (0013) to add `reviews.tip_amount` to the month's payout — today tips are stored and nobody pays them out.

**3.6 Refunds.** Cancel after an online payment → Razorpay refund API from an Edge Function → `payments.refunded`, `payment_status = 'refunded'`. Record `cancelled_at`, `cancelled_by`, `cancellation_reason` on both tables (*migration*).

### Phase 4 — Store readiness — code DONE; accounts and builds are the owner's

- **EAS:** copy `apps/partner/eas.json`, `eas init`, put the project id in `app.json` `extra.eas.projectId`; `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in each build profile's `env`. Bundle ids are already `in.myprimecompany.app`.
- **Apple sign-in** — required by App Store guideline 4.8 when Google is offered. `expo-apple-authentication` + Supabase Apple provider; same `createSessionFromUrl` path.
- **Account deletion** — required by App Store 5.1.1(v) and Play policy. Account → "Delete account" → RPC `delete_my_account()` (anonymise the `customers` row: name "Deleted customer", phone `deleted:<uid>`, email NULL; keep orders for accounting; delete addresses and prefs) then an Edge Function with the service role deletes the auth user.
- **Phone OTP** — when an SMS provider is chosen (Twilio or MSG91 through Supabase Auth → Phone), set `PHONE_OTP_ENABLED = true`; screens 5–6 are already built.
- **Deep links** — scheme `myprimecompany://booking/<kind>/<id>` and universal/app links for `https://www.myprimecompany.com/account/bookings/<id>` (`associatedDomains` / `intentFilters`).
- **Analytics** — there are no custom events anywhere (the website has GA4 `G-JGZ52K9QXX`, pageviews only). Define them here and mirror on the web: `sign_in`, `setup_complete`, `view_domain {deep|now}`, `view_category`, `view_service`, `add_to_cart`, `begin_checkout`, `booking_confirmed {order_number}`, `prime_now_slot_selected`, `prime_now_request_submitted {request_number}`, `prime_now_matched`, `reschedule_booking`, `cancel_booking`, `submit_review {stars, tip}`, `payment_success`. Use a provider that works in Expo Go (PostHog or Amplitude JS SDK).
- **Crash reporting** — `@sentry/react-native` via `sentry-expo`.
- **OTA updates** — `expo-updates` + EAS Update for JS-only fixes.
- **i18n scaffold** — move strings out of components into `src/i18n/en.ts`; Hindi is second (§11).
- **Store assets** — screenshots for both themes, privacy policy URL `https://www.myprimecompany.com/privacy`, Play Data Safety + App Privacy answers (name, phone, email, address, approximate location if Phase 5.3 ships).
- **Production copy** — `REDIRECT_HELP` in `src/lib/supabase.ts` mentions Supabase configuration; keep it behind `__DEV__` and show "Sign-in did not complete. Please try again." in release.

### Phase 5 — Features gated on business decisions (§11)

- **5.1 Prime Care membership** (₹999/year, 10% off) — `memberships` table, `create_booking` applies `discount`, Account banner becomes a purchase flow (needs Phase 3).
- **5.2 Coupons** — `coupons`, `coupon_redemptions`, `p_coupon` on `create_booking`, cart field. `orders.discount` already exists and `gstInclusive(gross, discount)` already handles it.
- **5.3 Service areas by pincode and the map** — `service_areas(pincode, city, is_live)`; `addresses` gains `pincode, lat, lng, locality`; screen 8 gets the pin (`expo-location` + `react-native-maps`, dev build only). Gate Prime Now availability on it.
- **5.4 Live map and ETA** — partner app reports location (`expo-location` background) into `helper_locations`; customer reads via a booking-scoped RPC. Deliberately not built until the partner side exists ("a table with no writer is a promise the UI cannot keep").
- **5.5 Job photos** — `job-photos` bucket, partner uploads before/after, customer views on Tracking.
- **5.6 Prime Now rating** — extend `submit_review` (or a sibling) to accept a request id; today only orders can be rated.
- **5.7 B2B enquiry** — form → `submit_business_enquiry()` → CRM list. The website has only an email line for this.
- **5.8 Referrals / wallet / Hindi** — no schema for any of these.

---

## 5. Database migration plan

Numbering continues from 0028. Every file: header comment explaining *why*, idempotent where possible, drop-then-create for signature changes, explicit revoke/grant.

| # | Contents | Phase | Status |
| --- | --- | --- | --- |
| 0029 | `reschedule_booking` writes a timeline row · `my_booking_helper()` · `public_reviews` view + anon column grants on `reviews` · `create_booking` `p_source` (drop + create) + qty cap 20 · `prime_now_requests.source` + parameter (drop + create) · `save_notification_prefs` clear/validate token · customers column grants · admin guard on `dispatch_*` · `my_stats()` with tips | 1 | applied |
| 0030 | `pg_net` · `en_route_at` on both tables · `mark_en_route()` · `my_jobs()` + `en_route_at` · Vault secret · `notify_secret()` · `notify_customer_event()` triggers → `notify-customer` | 2 | applied |
| 0031 | `payments` + `record_payment()` triggers · `paid_at` · cancellation columns · cancel RPCs record the customer · `invoices` own-row policy · `invoices` bucket + policies | 3 | applied |
| 0032 | `delete_my_account()` | 4 | applied |
| 0033+ | Razorpay columns if any (`payments` already covers captures/refunds) · memberships / coupons / service_areas / helper_locations / job-photos as decided | 3, 5 | — |

Edge functions deployed: `notify-customer` (v1, secret-authenticated), `delete-account` (v1, JWT). Sources in `supabase/functions/`. Redeploy with the Supabase MCP `deploy_edge_function` after editing.

After each: regenerate `packages/shared/src/database.types.ts` (it is stale at 0024 today — missing `booking_events`, `notification_prefs`, `reviews.tip_amount`, three RPCs, and `submit_review`'s fifth argument) and mirror the slice into `apps/customer/src/lib/types.ts`.

---

## 6. Notification matrix (Phase 2)

Gate = which `notification_prefs` flag must be true. All copy is push title / body.

| Event (source) | Gate | Title / body |
| --- | --- | --- |
| Order `confirmed` (CRM) | booking_updates | Booking confirmed / `<service>` on `<Sat, 30 Aug>` · `<window>`. |
| Order `vendor_assigned` (accept_offer or CRM) | booking_updates | Helper assigned / `<First name>` will come on `<date>`. Tap to see details. |
| `en_route` (partner, 2.3) | helper_en_route | Your helper is on the way / `<First name>` has set out for `<address label>`. |
| Order `in_progress` (partner) | booking_updates | Work has started / Your `<service>` is under way. |
| Order `completed` (partner) | booking_updates | All done / How did it go? Rate your helper and leave a tip. → opens Rate & tip |
| Order `cancelled` (CRM or customer) | booking_updates | Booking cancelled / `<ref>` was cancelled. Call us if that was not expected. |
| Reschedule (customer) | booking_updates | Date changed / `<ref>` is now on `<date>` · `<window>`. |
| Prime Now `dispatched` | booking_updates | Helper found / `<First name>` accepted your request and is on the way. |
| Prime Now `in_progress` / `completed` / `cancelled` | booking_updates | as above with "request" |
| Payment captured (Phase 3) | booking_updates | Payment received / ₹`<total>` for `<ref>`. Receipt in the app. |
| Offers and news | marketing | never automated; CRM-sent only |

Ops can still use the CRM's manual WhatsApp link; push does not replace a phone call for a failed dispatch.

---

## 7. Pricing rules (corrected)

- **Prices are GST-inclusive.** `total` is what the customer pays; `subtotal = round(total / 1.18, 2)`; `tax = total − subtotal`; CGST = SGST = tax / 2 with the remainder on SGST. Never add 18% on top. Show "Inclusive of 18% GST".
- **No visit charge** until the business decides. If added: server first (`create_booking`), client second (`VISIT_CHARGE`).
- **Per-unit services** (`per_sqft`, `per_panel`, `per_seat`): ask for units before adding; `line_total = price × units × qty`; label the total "Estimated" only when a per-unit line exists; final area confirmed on site.
- **Prime Now** is a flat slot price, no task add-ons, no travel charge, no GST split (the table has no tax columns).
- **Tips** ₹0–5,000, recorded on the review; paid out with the partner's earnings (make `my_stats` include them) or charged online once payments exist.
- **Discounts** (`orders.discount`) exist in the schema and in `gstInclusive()`; nothing writes them until coupons or membership ship.
- **Money is `numeric(10,2)` in the database and `number` in the app;** display with Indian grouping; use `formatINRPaise` only on tax lines.

---

## 8. Status vocabulary (single source of truth)

The database value is fixed. The three apps currently label it three different ways; the customer app uses "helper" (the v1 prompt's word). Recommend the website adopts the app's labels.

| DB value | Table | App label | Website label today | CRM label today |
| --- | --- | --- | --- | --- |
| `pending` | orders | Placed | Pending confirmation | Pending |
| `confirmed` | orders | Confirmed | Confirmed | Confirmed |
| `vendor_assigned` | orders | Helper assigned | Professional assigned | Vendor assigned |
| `in_progress` | both | In progress | In progress | In progress |
| `completed` | both | Completed | Completed | Completed |
| `cancelled` | both | Cancelled | Cancelled | Cancelled |
| `new` | prime_now_requests | Finding a helper | — | New |
| `dispatched` | prime_now_requests | Helper assigned | — | Dispatched |
| `en_route` (0030: `en_route_at` on both tables; a `booking_events` row for orders) | — | Helper on the way | — | — |

Customer may cancel: orders in `pending`/`confirmed`; requests in `new`/`dispatched` — the app hides the button once the helper is on the way, though the server would still allow it. Customer may reschedule: orders in `pending`/`confirmed`. Customer may rate: orders in `completed`. The CRM can move an order backwards; render the timeline from the latest event, never assume monotonic order.

---

## 9. Visual system and copy

Already implemented; do not reinvent. Tokens in `apps/customer/global.css` (light and dark), raw values in `src/lib/theme.ts`, components in `src/components/ui.tsx` (`Screen, Body, Card, H1, H2, Muted, Eyebrow, Button, Field, Chip, Badge, Dots, Loading, Banner, StickyBar, Refresher`).

Palette: primary `#0E5A63` (dark: `#4EA3AC`), background `#FBFAF7` (dark `#0D1A21`), ink `#12212A` (dark `#0A151B`), amber `#E8A33D` on dark grounds only, border `#E7E3DB`, tint `#EDF3F2`, destructive `#C0553F`. Manrope throughout (800 headlines, −0.03em), JetBrains Mono for eyebrows, counts and references. 22 px gutters, 14–18 px radii, 16 px buttons, 999 px chips, 44 px minimum hit target, one shadow (sticky bars), no gradients, no emoji, photography does the work. Selected state is a filled shape, never colour alone. Bottom tabs: Home · Bookings · Help · Account with Ionicons outline/filled pairs.

---

## 10. Acceptance — the script to run before calling any phase done

Run on a physical Android phone in Expo Go 54 (and a dev build for push/maps), signed in as a fresh email account.

1. Sign in with a new email → profile → address (Bangalore) → notifications → Home. `customers` row exists with `auth_user_id`; one default address.
2. Deep Cleaning → Home Deep Cleaning → 2 BHK → Add → Marble & Floor Polishing → 500 sq. ft. → cart shows ₹3,499 + ₹1,500 = ₹4,999, "Inclusive of 18% GST", labelled Estimated. Confirm → order in CRM with `total 4999`, `subtotal 4236.44`, `tax 762.56`, two items (`units` 1 and 500), `source = 'app'` (after 1.8).
3. CRM sets `confirmed` → app timeline updates **without** pull-to-refresh. Reschedule from the app (after 1.1) → CRM shows the new date, timeline shows the entry.
4. CRM assigns a partner → app shows the helper card (after 1.3) and "Helper assigned" push (after 2). Partner taps Start → "In progress" live. Partner completes with cash → app shows Paid, "Rate your helper" → 5 stars + ₹50 tip → `reviews` row with `tip_amount 50`; `services.rating` refreshes.
5. Cancel: a `pending` booking cancels from the app; a `vendor_assigned` one shows "call us" and no button; `cancel_booking` is never called in a state it refuses.
6. Prime Now → 1 hour → three chips → Right now → request created with `customer_id` set; a partner who is online and `accepts_prime_now` receives the offer within seconds; "Cancel request" before acceptance → request `cancelled`, the offer leaves the partner's banner, no further waves. Repeat and let the partner accept → matching screen flips to "Helper found" → Bookings shows it under Upcoming with "Helper assigned".
7. Rate limits: the 3rd request within an hour from the same phone shows the server's exact message.
8. Dark mode: every screen readable with System set to dark, including keyboard, pull-to-refresh, tab bar, status bar.
9. Sign out → token cleared (after 1.14), cart persists, no data from the previous account visible after signing in as another.
10. `npx tsc --noEmit` = 0 errors; bundle builds; no red box on cold start in Expo Go.

---

## 11. Open decisions for the business (with the default the app takes if unanswered)

1. **Prime Now rates** — ₹199 / ₹349 / ₹499 / ₹1,199 are live. Confirm or give new numbers (migration). *Default: keep.*
2. **Visit charge** — none is billed today. *Default: none.*
3. **Re-clean window** — the site says 24 h (homepage) and 48 h (FAQ, Terms, Refund policy). *Default: 48 h, matching the legal pages.*
4. **Cancellation rule** — "free before the helper sets out" vs "free up to 12 h before the slot"; the code allows cancel only while unassigned. *Default: keep the code's rule and word the copy to match: "Free to cancel until a helper is assigned; after that, call us."*
5. **Cities** — the database says Bangalore; the site says 12 (and once 14). *Default: the database; fix the website.*
6. **Vocabulary** — helper / professional / partner. *Default: "helper" to customers, "partner" to ops.*
7. **Prime Care membership** — ₹999/year for 10 %: keep, reprice or drop. *Default: stays "coming soon".*
8. **Payments** — Razorpay; pay-now optional or required. *Default: pay after the work stays the default; pay-now offered when Phase 3 ships.*
9. **SMS provider** for phone OTP (Twilio / MSG91). *Default: email + Google until chosen.*
10. **"On the way"** — add the partner button (2.3) or drop the preference. *Default: add it.*
11. **Prime Now rating** — allow rating a request. *Default: yes, Phase 5.6.*
12. **Account deletion** retention — anonymise and keep orders for accounting. *Default: yes.*
13. **Hindi** — second language. *Default: scaffold only.*
14. **Apple sign-in / iOS release** — needed only if the app ships on iOS. *Default: build it in Phase 4.*

---

## 12. Ops housekeeping (not app work, but blocks a clean launch)

- Cancel the test orders `PHC-20260708-0001/-0002/-0003/-0004/-0005/-0006/-0009`, `PHC-20260715-0013`, `PHC-20260822-0022` from the CRM.
- Correct the ₹659,890 "paid" order `PHC-20260716-0017`.
- Contact the customers with unserved July bookings (7 orders still `pending`).
- Close or serve the 9 open anonymous Prime Now requests from the website (`PN-20260822-0002 … PN-20260823-0010`); three are `dispatched` to one partner, six are still `new` and re-broadcasting every minute.
- `eas init` for both apps; recruit and bring online more than one Bangalore partner.

---

## Appendix A — Repo map for the customer app

```
apps/customer/
├─ App.tsx                     navigation, fonts, theme, AppearanceProvider → Shell → Root
├─ app.json                    userInterfaceStyle automatic, scheme myprimecompany, ids in.myprimecompany.app
├─ global.css                  light + dark tokens
├─ tailwind.config.js          token → className mapping, fonts, radii
├─ src/components/ui.tsx       the UI vocabulary
├─ src/lib/
│  ├─ supabase.ts              client, setAuth, Google OAuth, email, OTP (gated), errorMessage
│  ├─ session.tsx              SessionProvider: session, profile, addresses, setupStep
│  ├─ appearance.tsx           System / Light / Dark, persisted
│  ├─ theme.ts                 Palette, useColors(), radius, GUTTER
│  ├─ catalog.ts               categories, services, cities, imageUrl()
│  ├─ bookings.ts              create/cancel/reschedule/review, prefs, profile, address, isUpcoming, canCancel
│  ├─ prime-now.ts             SLOTS, TASKS, GUARANTEES, createPrimeNowRequest, fetchDispatchState
│  ├─ cart.tsx                 CartProvider (AsyncStorage)
│  ├─ format.ts                formatINR, formatINRPaise, dates
│  └─ types.ts                 schema slice, STATUS_LABEL, TIMELINE_STEPS, PRIME_TIMELINE_STEPS
├─ src/navigation/types.ts     HomeStackParams, BookingsStackParams
└─ src/screens/
   ├─ onboarding/  SplashScreen, Intro
   ├─ auth/        SignInScreen, VerifyCodeScreen, SetupScreens (Profile, Address, Notifications)
   ├─ deep/        HomeScreen, CategoriesScreen, ServicesScreen, ServiceDetailScreen
   ├─ now/         PrimeSlotScreen, PrimeDescribeScreen, PrimeWhenScreen, PrimeMatchingScreen
   ├─ checkout/    CartScreen, SlotPaymentScreen, ConfirmedScreen
   ├─ bookings/    MyBookingsScreen, TrackingScreen, RateTipScreen
   └─ account/     AccountScreen, HelpScreen
```

Commands: `cd apps/customer && npm install` · `npx expo start --clear --port 8082` · `npx tsc --noEmit`. Env: `.env` with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (inlined at bundle time — restart with `--clear` after editing).

## Appendix B — Traps already hit

- PostgREST overloads (§0.3). · Realtime `setAuth` (§0.5). · `react-native-css-interop` must be a direct dependency or `className` is untyped (182 errors). · Metro `nullthrows` = corrupt cache → `--clear`. · Fast Refresh does not re-register `@expo/vector-icons` fonts → load `Ionicons.font` through `useFonts`. · Google OAuth: the device's redirect URL must be on Supabase's allow-list or GoTrue silently sends the browser to the Site URL; `generate_link` is **not** a valid way to test this. · `customers.phone` is NOT NULL + UNIQUE: a Google sign-up stores `pending:<uid>` until a real number arrives — never display it. · Windows shell: long heredocs get truncated; write scripts with the file tool and run them.

## Appendix C — Documents that are stale; do not trust

`docs/LLD.md` §6.2 (`home-client.tsx`) and §6.4 (Prime Now "then opens WhatsApp" — removed; the request is the booking) · `apps/partner/README.md` ("Realtime is not enabled", "no CRM review UI") · `supabase/apply-all.sql` (stops at 0002) · `supabase/README.md` (documents two migrations) · `packages/shared/src/database.types.ts` (stops at 0024) · `supabase/seed/seed-services.ts` (imports an export that no longer exists) · the v1 app prompt's §5 data model (Clerk, `profiles`, `bookings`, `payments`, `helpers`, `dispatch_requests`, `helper_locations` — none exist; the live tables are `customers`, `orders`, `order_items`, `prime_now_requests`, `job_offers`, `booking_events`, `notification_prefs`, `reviews`, `addresses`, `vendors`).

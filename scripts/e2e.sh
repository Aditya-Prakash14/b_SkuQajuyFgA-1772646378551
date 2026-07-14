#!/usr/bin/env bash
# ============================================================================
# MyPrimeCompany — end-to-end smoke suite
#
#   pnpm test:e2e
#
# Requires both dev servers running (pnpm dev:web / pnpm dev:crm) and
# apps/web/.env.local to exist (for the Supabase URL + anon key).
#
# Covers: RLS boundaries, auth-gated booking, the public partner RPC,
# every website route, branding, and the CRM auth guard.
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/apps/web/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ Missing $ENV_FILE — copy apps/web/.env.example and fill it in."
  exit 1
fi

URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r"')
ANON=$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r"')
WEB="${WEB_URL:-http://localhost:3000}"
CRM="${CRM_URL:-http://localhost:3001}"

pass=0; fail=0
ok()  { if [ "$2" = "$3" ]; then echo "  PASS  $1"; pass=$((pass+1)); else echo "  FAIL  $1 (got '$3', want '$2')"; fail=$((fail+1)); fi; }
has() { if echo "$3" | grep -q "$2"; then echo "  PASS  $1"; pass=$((pass+1)); else echo "  FAIL  $1"; fail=$((fail+1)); fi; }
acount() {
  curl -s -I "$URL/rest/v1/$1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
    -H "Prefer: count=exact" | grep -i content-range | sed 's#.*/##' | tr -d '\r'
}

echo "── Supabase: public catalog (anon) ──"
ok "anon reads live services"       20 "$(acount 'services?is_active=eq.true&select=id')"
ok "anon reads categories"           7 "$(acount 'service_categories?select=id')"

echo ""
echo "── Supabase: RLS boundaries (anon must see NOTHING) ──"
for t in orders customers vendors invoices admin_users; do
  ok "anon blocked from $t" 0 "$(acount "$t?select=id")"
done

echo ""
echo "── Supabase: write paths ──"
SID=$(curl -s "$URL/rest/v1/services?slug=eq.2-bhk-deep-cleaning&select=id" \
      -H "apikey: $ANON" -H "Authorization: Bearer $ANON" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
BOOK=$(curl -s "$URL/rest/v1/rpc/create_booking" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"p_name\":\"E2E\",\"p_phone\":\"9911220000\",\"p_email\":null,\"p_city\":\"Pune\",\"p_address\":\"x\",\"p_scheduled_date\":\"2026-12-01\",\"p_items\":[{\"service_id\":\"$SID\",\"qty\":1}],\"p_notes\":null}")
has "unauthenticated booking is REJECTED" "Please sign in" "$BOOK"

PART=$(curl -s "$URL/rest/v1/rpc/submit_vendor_application" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '{"p_name":"E2E Partner","p_phone":"9876500099","p_email":null,"p_city":"Jaipur","p_note":"e2e"}')
has "public partner application accepted" "vendor_id" "$PART"

echo ""
echo "── Website routes ──"
for p in / /services /about /contact /become-partner /careers /blog /faq /privacy /terms /refund-policy \
         /blog/how-pest-control-protects-your-home /services/1-bhk-deep-cleaning /services/office-deep-cleaning; do
  ok "$p" 200 "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$WEB$p")"
done

echo ""
echo "── Branding & link hygiene ──"
HOME=$(curl -s "$WEB/")
has "shows MyPrimeCompany"            "MyPrimeCompany" "$HOME"
ok  "no legacy brand name"          0 "$(echo "$HOME" | grep -c 'Prime Home Care')"
ok  "no dead href=\"#\" links"      0 "$(echo "$HOME" | grep -o 'href="#"' | wc -l | tr -d ' ')"

echo ""
echo "── CRM auth guard ──"
ok "crm /login reachable"           200 "$(curl -s -o /dev/null -w '%{http_code}' "$CRM/login")"
ok "crm /dashboard requires auth"   307 "$(curl -s -o /dev/null -w '%{http_code}' "$CRM/dashboard")"

echo ""
echo "════════ E2E: $pass passed, $fail failed ════════"
[ "$fail" -eq 0 ] || exit 1

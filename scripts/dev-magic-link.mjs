#!/usr/bin/env node
/**
 * Mint a partner-app magic link without email delivery.
 *
 *   node scripts/dev-magic-link.mjs someone@example.com [redirect]
 *
 * DEV TOOL ONLY. Supabase's built-in sender is capped at ~2 emails/hour and
 * Gmail often drops it, so during development we generate the sign-in link via
 * the Auth admin API and open it on the phone ourselves (paste it into the
 * phone's browser, or send it to yourself on WhatsApp).
 *
 * `redirect` defaults to the Expo Go callback for this PC's LAN IP. It must be
 * on Supabase → Authentication → URL Configuration → Redirect URLs; if it is
 * not, the printed link will show `redirect_to=https://myprimecompany.com` —
 * that is GoTrue telling you the allow-list entry is missing.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from apps/crm/.env.local (never commit it).
 */
import { readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const email = process.argv[2]
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/dev-magic-link.mjs <email> [redirect-url]')
  process.exit(1)
}

const lanIp =
  Object.values(networkInterfaces())
    .flat()
    .find((n) => n && n.family === 'IPv4' && !n.internal)?.address ?? 'localhost'
const redirect = process.argv[3] ?? `exp://${lanIp}:8081/--/auth/callback`

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = readFileSync(join(root, 'apps/crm/.env.local'), 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim()
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const key = get('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/crm/.env.local')
  process.exit(1)
}

const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'magiclink', email, options: { redirect_to: redirect } }),
})
const body = await res.json()
if (!res.ok || !body.action_link) {
  console.error(`Failed (${res.status}): ${body.msg ?? body.error_description ?? JSON.stringify(body)}`)
  process.exit(1)
}

const landed = new URL(body.action_link).searchParams.get('redirect_to')
console.log(`\n  Magic link for ${email}:\n\n  ${body.action_link}\n`)
if (landed !== redirect) {
  console.log(`  !! Supabase replaced your redirect with ${landed}`)
  console.log(`     Add this to Authentication → URL Configuration → Redirect URLs:`)
  console.log(`       ${redirect.replace(/\/--\/.*$/, '/**')}\n`)
} else {
  console.log(`  Opens the app at ${redirect}. One use, expires in about an hour.\n`)
}

#!/usr/bin/env node
/**
 * Mint a partner-app sign-in code without email delivery.
 *
 *   node scripts/dev-otp.mjs someone@example.com
 *
 * DEV TOOL ONLY. Supabase's built-in email sender is capped at ~2 emails/hour
 * and Gmail often drops it, so during development we generate the OTP directly
 * via the Auth admin API instead of waiting on an inbox. The printed code is
 * typed into the app's "Code from your email" field like a normal OTP.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from apps/crm/.env.local (never commit it).
 * The account must already exist (sign-in once from the app creates it —
 * "Send code" registers the user even when the email never arrives).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const email = process.argv[2]
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/dev-otp.mjs <email>')
  process.exit(1)
}

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
  body: JSON.stringify({ type: 'magiclink', email }),
})
const body = await res.json()

if (!res.ok || !body.email_otp) {
  console.error(`Failed (${res.status}): ${body.msg ?? body.error_description ?? JSON.stringify(body)}`)
  if (res.status === 404 || /user.*not.*found/i.test(JSON.stringify(body))) {
    console.error('\nThat account does not exist yet. In the app, enter this email and tap')
    console.error('"Send code" once (registers the user even if no email arrives), then re-run.')
  }
  process.exit(1)
}

console.log(`\n  Sign-in code for ${email}:  ${body.email_otp}\n`)
console.log('  Enter it in the partner app. Expires in about an hour;')
console.log('  each new code invalidates the previous one for this email.')

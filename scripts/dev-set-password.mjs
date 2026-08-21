#!/usr/bin/env node
/**
 * Give a partner-app account a password, confirmed, with no email involved.
 *
 *   node scripts/dev-set-password.mjs someone@example.com 'their-password'
 *
 * DEV TOOL ONLY. Creates the user if missing, or updates the password if the
 * account exists; either way the email is marked confirmed, so the app's
 * email+password sign-in works even while "Confirm email" is still ON in
 * Supabase → Authentication → Providers → Email. (Turn that off and new
 * partners can self-register from the app without this script.)
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from apps/crm/.env.local (never commit it).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [email, password] = process.argv.slice(2)
if (!email || !email.includes('@') || !password || password.length < 6) {
  console.error("Usage: node scripts/dev-set-password.mjs <email> '<password, 6+ chars>'")
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
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

// Look the account up by email (admin list endpoint filters server-side).
const list = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=50`, { headers }).then((r) => r.json())
const existing = (list.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase())

const res = existing
  ? await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password, email_confirm: true }),
    })
  : await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
const body = await res.json()
if (!res.ok) {
  console.error(`Failed (${res.status}): ${body.msg ?? body.error_description ?? JSON.stringify(body)}`)
  process.exit(1)
}

console.log(`\n  ${existing ? 'Password updated' : 'Account created'} for ${email} (email confirmed).`)
console.log('  Sign in from the partner app with that email and password.\n')

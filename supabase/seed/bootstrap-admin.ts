/**
 * Bootstrap the first CRM admin — no signup form exists, so we provision the
 * super_admin directly with the service-role key.
 *
 *   pnpm bootstrap            (from repo root)
 *   pnpm --filter @prime/supabase-seed bootstrap
 *
 * Reads from supabase/seed/.env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME   (optional — defaults below)
 *
 * Idempotent: re-running reuses the existing auth user and upserts the row.
 * Run AFTER the schema migration (needs the admin_users table).
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@prime/shared'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = (process.env.ADMIN_EMAIL ?? 'admin@primehomecare.in').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD ?? 'PrimeAdmin@2026'
const fullName = process.env.ADMIN_NAME ?? 'Prime Admin'

if (!url || !serviceKey) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in supabase/seed/.env')
  process.exit(1)
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUserId(): Promise<string | undefined> {
  // listUsers is paginated; scan a few pages for the email (fresh projects: 1 page)
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 200) break
  }
  return undefined
}

async function main() {
  console.log(`→ Bootstrapping super_admin ${email}`)

  let userId: string | undefined
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no email flow — usable immediately
  })

  if (error) {
    if (/registered|exists|already/i.test(error.message)) {
      console.log('  auth user already exists — reusing')
      userId = await findUserId()
    } else {
      throw new Error(`createUser failed: ${error.message}`)
    }
  } else {
    userId = created.user?.id
  }

  if (!userId) throw new Error('Could not resolve the auth user id')

  const { error: upErr } = await supabase.from('admin_users').upsert(
    { id: userId, full_name: fullName, email, role: 'super_admin', is_active: true },
    { onConflict: 'id' },
  )
  if (upErr) throw new Error(`admin_users upsert failed: ${upErr.message}`)

  console.log('✓ super_admin ready')
  console.log(`    email:    ${email}`)
  console.log(`    password: ${password}`)
  console.log('    (change this password after first login)')
}

main().catch((e) => {
  console.error('✗ Bootstrap failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})

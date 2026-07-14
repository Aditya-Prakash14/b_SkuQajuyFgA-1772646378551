import { createClient } from '@supabase/supabase-js'
import type { Database } from '@prime/shared'

/**
 * Service-role Supabase client — bypasses RLS and can use the Auth admin API.
 * SERVER-ONLY. The key is not NEXT_PUBLIC_, so it never reaches a client bundle.
 * Only import this from server actions guarded by a super_admin check.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

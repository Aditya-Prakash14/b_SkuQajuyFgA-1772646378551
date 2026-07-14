import { createClient } from '@supabase/supabase-js'
import type { Database } from '@prime/shared'

/**
 * Stateless anon Supabase client for the public marketing site.
 * Used for catalog reads (server components) and the create_booking() RPC
 * (checkout). No auth/session — the anon key only reaches the RLS-guarded
 * public surface (active catalog + the booking RPC).
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@prime/shared'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env'

/**
 * Browser Supabase client (anon key) WITH session persistence — used for
 * Google OAuth sign-in and for the authenticated create_booking() RPC.
 * Singleton so auth state is shared across components.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return client
}

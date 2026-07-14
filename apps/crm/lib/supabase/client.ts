'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@prime/shared'

/** Browser Supabase client (anon key). Persists the session to cookies so the
 *  server client + middleware can read it. Never uses the service-role key. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

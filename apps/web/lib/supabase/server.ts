import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@prime/shared'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

/**
 * Server Supabase client with cookie access — used by the OAuth callback route
 * to exchange the auth code for a session. Catalog reads keep using the
 * stateless client in ./public so pages stay statically renderable (ISR).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component render — safe to ignore.
          }
        },
      },
    },
  )
}

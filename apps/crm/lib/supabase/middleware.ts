import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@prime/shared'
import { supabaseAuthEnv } from '@/lib/env'

/**
 * Refreshes the Supabase session cookie and enforces coarse route auth:
 *   • /dashboard/* requires a signed-in user (else → /login)
 *   • /login while signed in → /dashboard
 *
 * Fine-grained authorization (is this user an ACTIVE admin?) is enforced in
 * app/dashboard/layout.tsx, not here, to avoid a DB round-trip per request.
 *
 * With no Supabase env this is a local dev preview and everything is allowed
 * through. supabaseAuthEnv() throws rather than returning null in production,
 * so that path can never be reached by a deployed build.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const env = supabaseAuthEnv()
  if (!env) return supabaseResponse

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // IMPORTANT: getUser() (not getSession()) — it revalidates the JWT with the
  // Auth server. Do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (path.startsWith('/dashboard') && !user) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/login'
    return NextResponse.redirect(redirect)
  }

  if (path === '/login' && user) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/dashboard'
    return NextResponse.redirect(redirect)
  }

  return supabaseResponse
}

import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rescues an OAuth redirect that Supabase delivered to the wrong path.
 *
 * When `redirect_to` is missing from the project's Redirect URLs allow-list,
 * Supabase does NOT fail — it silently falls back to the Site URL and drops
 * `?code=…` on "/", where nothing redeems it. Sign-in then appears to do
 * nothing at all, and replaying that stale URL later reports the thoroughly
 * misleading "OAuth state has expired" (the state was fine; it was simply never
 * consumed).
 *
 * Forwarding those params to the callback route makes sign-in complete whether
 * or not the allow-list is configured, on localhost and on every preview domain.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  if (pathname !== '/') return NextResponse.next()
  if (!searchParams.has('code') && !searchParams.has('error')) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/auth/callback'
  if (!url.searchParams.has('next')) url.searchParams.set('next', '/')

  // The callback redirects failures to /?auth_error=… — a different param, so
  // this cannot loop.
  return NextResponse.redirect(url)
}

export const config = { matcher: '/' }

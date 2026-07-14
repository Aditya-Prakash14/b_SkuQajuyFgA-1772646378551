import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Google OAuth (PKCE) callback — exchanges the code for a session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/'

  const fail = (reason: string) => {
    console.error('[auth/callback]', reason)
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(reason)}`)
  }

  // Google or Supabase can reject before a code is ever issued: consent denied,
  // provider disabled, replayed/expired state. Report what actually went wrong
  // instead of a generic failure.
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  if (providerError) return fail(providerError)

  const code = searchParams.get('code')
  if (!code) return fail('Google did not return a sign-in code. Please try again.')

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return fail(error.message)

  const separator = next.includes('?') ? '&' : '?'
  return NextResponse.redirect(`${origin}${next}${separator}signed_in=1`)
}

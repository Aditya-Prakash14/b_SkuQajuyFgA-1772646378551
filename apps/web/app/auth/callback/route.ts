import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Google OAuth (PKCE) callback — exchanges the code for a session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const separator = next.includes('?') ? '&' : '?'
      return NextResponse.redirect(`${origin}${next}${separator}signed_in=1`)
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`)
}

import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { AppState } from 'react-native'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY\n\n' +
      'Local:  cp apps/customer/.env.example apps/customer/.env  (then fill it in)\n\n' +
      'EXPO_PUBLIC_* is inlined by Metro at bundle time — restart `npx expo start -c`\n' +
      'after editing .env or the old value stays baked into the bundle.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No URL to parse in React Native — a browser-only concern, and leaving it
    // on makes the client wait on a redirect that never arrives.
    detectSessionInUrl: false,
  },
})

// supabase-js refreshes on a timer, which the OS suspends in the background.
// Without this the first call after a long backgrounding fails on a dead JWT.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})

/**
 * Hand the current JWT to the realtime socket.
 *
 * Postgres-changes subscriptions are filtered by RLS and the socket does NOT
 * pick up the session on its own: without this a channel subscribes fine and
 * then never delivers a row. Re-running it on TOKEN_REFRESHED matters just as
 * much — the access token expires hourly and a stale socket goes quiet rather
 * than erroring.
 */
supabase.auth.onAuthStateChange((_event, session) => {
  supabase.realtime.setAuth(session?.access_token ?? null)
})

/** Where OAuth sends the browser back to. */
export function authRedirectUrl() {
  return Linking.createURL('auth/callback')
}

/**
 * Turn an incoming deep link into a session. Handles both shapes GoTrue emits:
 * implicit (`#access_token=…`) and PKCE (`?code=…`). Returns true when the URL
 * carried a session, so callers can ignore unrelated links.
 */
export async function createSessionFromUrl(incoming: string): Promise<boolean> {
  const hashIndex = incoming.indexOf('#')
  const fragment = hashIndex >= 0 ? incoming.slice(hashIndex + 1) : ''
  const query = incoming.split('#')[0].split('?')[1] ?? ''
  const params = new URLSearchParams(fragment || query)

  const desc = params.get('error_description') ?? params.get('error')
  if (desc) throw new Error(desc.replace(/\+/g, ' '))

  const code = params.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return true
  }

  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) throw error
    return true
  }
  return false
}

/**
 * Google sign-in.
 *
 * `skipBrowserRedirect` keeps supabase-js from trying to navigate (meaningless
 * in RN); we open the URL ourselves and read the redirect back off the result,
 * so the whole exchange happens without leaving the app.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = authRedirectUrl()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data?.url) throw new Error('Could not start Google sign-in. Please try again.')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type === 'success' && result.url) {
    await createSessionFromUrl(result.url)
    return
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign-in cancelled.')
  }
  throw new Error('Sign-in did not complete. Please try again.')
}

/**
 * Phone + OTP, per the product spec. Off until an SMS provider is configured
 * in Supabase (Authentication → Providers → Phone); the UI reads this flag and
 * hides the phone form rather than offering something that cannot work.
 */
export const PHONE_OTP_ENABLED = false

export async function sendPhoneOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` })
  if (error) throw error
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token, type: 'sms' })
  if (error) throw error
}

/** Postgres exceptions from our RPCs are already human-readable — surface them. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = String((err as { message: unknown }).message)
    if (m) return m
  }
  return err instanceof Error ? err.message : fallback
}

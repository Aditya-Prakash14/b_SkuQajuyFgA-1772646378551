import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { AppState } from 'react-native'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY\n\n' +
      'Local:  cp apps/partner/.env.example apps/partner/.env  (then fill it in)\n\n' +
      'EXPO_PUBLIC_* is inlined by Metro at bundle time — restart `npx expo start -c`\n' +
      'after editing .env or the old value stays baked into the bundle.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No URL to parse in React Native — this is a browser-only concern and
    // leaving it on makes the client wait on a redirect that never arrives.
    detectSessionInUrl: false,
  },
})

// supabase-js refreshes on a timer, which the OS suspends in the background.
// Without this the first call after a long backgrounding fails on a dead JWT.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})

/** Postgres exceptions from our RPCs are already human-readable — surface them. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = String((err as { message: unknown }).message)
    if (m) return m
  }
  return err instanceof Error ? err.message : fallback
}

/**
 * Where the magic-link email sends the partner back to.
 *   Expo Go:      exp://192.168.1.37:8081/--/auth/callback
 *   Store build:  primepartner://auth/callback   (scheme from app.json)
 * Both must be on Supabase → Authentication → URL Configuration → Redirect URLs,
 * otherwise GoTrue silently swaps in the Site URL and the link opens the website.
 */
export function authRedirectUrl() {
  return Linking.createURL('auth/callback')
}

/**
 * Turn an incoming deep link into a session. Handles both shapes GoTrue emits:
 *   implicit:  …#access_token=…&refresh_token=…   (magic link default)
 *   pkce:      …?code=…
 * Returns true when the URL was an auth link (success or failure) so callers
 * can ignore unrelated links. Throws with GoTrue's own message on failure.
 */
export async function createSessionFromUrl(url: string): Promise<boolean> {
  const hashIndex = url.indexOf('#')
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : ''
  const query = url.split('#')[0].split('?')[1] ?? ''
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

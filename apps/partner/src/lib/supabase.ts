import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
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

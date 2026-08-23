import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { identify, resetAnalytics, track } from './analytics'
import { fetchAddresses, fetchNotificationPrefs, fetchProfile } from './bookings'
import { clearCache } from './offline'
import { unregisterPush } from './push'
import { createSessionFromUrl, deleteMyAccount, supabase } from './supabase'
import type { Address, Profile } from './types'

/**
 * Who is signed in, and whether they have finished setting up.
 *
 * Profile completion gates entry to the app but happens *after* the auth
 * session exists, per the spec: a signed-in user without a default address is
 * routed to the address step rather than the home screen.
 *
 * The first two steps are derived from data (a name, an address). The third —
 * notifications — has no row to derive from when the customer taps "Not now",
 * so finishing it is remembered on the phone per account; a saved
 * notification_prefs row counts as finished too, so a reinstall does not
 * re-ask someone who already answered.
 */

export type SetupStep = 'profile' | 'address' | 'notifications' | 'done'

const setupKey = (uid: string) => `mpc.setupDone.${uid}`

interface SessionValue {
  session: Session | null
  booting: boolean
  profile: Profile | null
  addresses: Address[]
  defaultAddress: Address | null
  /** Local draft for a user who has not booked yet (no customers row). */
  draft: { name: string; email: string }
  setDraft: (d: { name: string; email: string }) => void
  setupStep: SetupStep
  markSetupStep: (s: SetupStep) => void
  /** Explicit back-navigation through setup, which is otherwise derived from data. */
  goToStep: (s: SetupStep | null) => void
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  /** Anonymise the customer and remove the sign-in. Irreversible. */
  deleteAccount: () => Promise<void>
}

const Ctx = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [draft, setDraft] = useState({ name: '', email: '' })
  const [setupDone, setSetupDone] = useState(false)
  const [override, setOverride] = useState<SetupStep | null>(null)

  const refresh = useCallback(async () => {
    const [p, a, prefs] = await Promise.all([
      fetchProfile().catch(() => null),
      fetchAddresses().catch(() => [] as Address[]),
      fetchNotificationPrefs().catch(() => null),
    ])
    setProfile(p)
    setAddresses(a)
    if (prefs) setSetupDone(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setBooting(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' && next) {
        identify(next.user.id)
        track('sign_in', { provider: next.user.app_metadata?.provider ?? 'email' })
      }
      if (!next) {
        setProfile(null)
        setAddresses([])
        setSetupDone(false)
      }
    })

    // OAuth lands back here as a deep link; turn it into a session.
    const onUrl = (url: string | null) => {
      if (url) createSessionFromUrl(url).catch(() => {})
    }
    Linking.getInitialURL().then(onUrl)
    const link = Linking.addEventListener('url', (e) => onUrl(e.url))

    return () => {
      sub.subscription.unsubscribe()
      link.remove()
    }
  }, [])

  // Whether this account finished setup on this phone is read before the
  // profile so a returning customer never flashes the setup screens.
  useEffect(() => {
    if (!session) return
    const uid = session.user.id
    AsyncStorage.getItem(setupKey(uid))
      .then((v) => {
        if (v === '1') setSetupDone(true)
      })
      .catch(() => {})
      .finally(() => {
        refresh()
      })
  }, [session, refresh])

  const value = useMemo<SessionValue>(() => {
    const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null
    const hasName = Boolean(profile?.name || draft.name)

    let setupStep: SetupStep = 'done'
    if (session) {
      if (!hasName) setupStep = 'profile'
      else if (!defaultAddress) setupStep = 'address'
      else if (!setupDone) setupStep = 'notifications'
      // An explicit Back wins over what the data implies — otherwise a saved
      // name would bounce the customer straight forward again.
      if (override) setupStep = override
    }

    return {
      session,
      booting,
      profile,
      addresses,
      defaultAddress,
      draft,
      setDraft,
      setupStep,
      markSetupStep: (s: SetupStep) => {
        setOverride(null) // moving forward clears any Back the customer took
        if (s === 'done') {
          setSetupDone(true)
          if (session) AsyncStorage.setItem(setupKey(session.user.id), '1').catch(() => {})
        }
      },
      goToStep: setOverride,
      refresh,
      signOut: async () => {
        // While the session still exists: stop this phone receiving the
        // account's pushes. Then the next account must not find the last
        // one's bookings either.
        await unregisterPush()
        await supabase.auth.signOut()
        await clearCache()
        resetAnalytics()
      },
      deleteAccount: async () => {
        const uid = session?.user.id
        await deleteMyAccount()
        if (uid) AsyncStorage.removeItem(setupKey(uid)).catch(() => {})
        // The auth user is gone server-side; the local sign-out may already
        // be moot, so it is never allowed to fail the flow.
        await supabase.auth.signOut().catch(() => {})
        await clearCache()
        resetAnalytics()
      },
    }
  }, [session, booting, profile, addresses, draft, setupDone, override, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}

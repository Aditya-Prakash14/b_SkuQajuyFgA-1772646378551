import type { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { fetchAddresses, fetchProfile } from './bookings'
import { clearCache } from './offline'
import { createSessionFromUrl, supabase } from './supabase'
import type { Address, Profile } from './types'

/**
 * Who is signed in, and whether they have finished setting up.
 *
 * Profile completion gates entry to the app but happens *after* the auth
 * session exists, per the spec: a signed-in user without a default address is
 * routed to the address step rather than the home screen.
 *
 * Note on the data model: a `customers` row is created by create_booking on the
 * first booking, so a brand-new account legitimately has no profile yet. The
 * app therefore treats "profile complete" as *has at least one address*, and
 * carries the name/phone locally until the first booking writes them.
 */

export type SetupStep = 'profile' | 'address' | 'notifications' | 'done'

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
}

const Ctx = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [draft, setDraft] = useState({ name: '', email: '' })
  const [stepDone, setStepDone] = useState<SetupStep | null>(null)
  const [override, setOverride] = useState<SetupStep | null>(null)

  const refresh = useCallback(async () => {
    const [p, a] = await Promise.all([
      fetchProfile().catch(() => null),
      fetchAddresses().catch(() => [] as Address[]),
    ])
    setProfile(p)
    setAddresses(a)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setBooting(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => {
      setSession(next)
      if (!next) {
        setProfile(null)
        setAddresses([])
        setStepDone(null)
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

  useEffect(() => {
    if (session) refresh()
  }, [session, refresh])

  const value = useMemo<SessionValue>(() => {
    const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null
    const hasName = Boolean(profile?.name || draft.name)

    let setupStep: SetupStep = 'done'
    if (session) {
      if (!hasName) setupStep = 'profile'
      else if (!defaultAddress) setupStep = 'address'
      else if (stepDone !== 'notifications' && stepDone !== 'done') setupStep = 'notifications'
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
        setStepDone(s)
      },
      goToStep: setOverride,
      refresh,
      signOut: async () => {
        await supabase.auth.signOut()
        // The next account on this phone must not find the last one's bookings.
        await clearCache()
      },
    }
  }, [session, booting, profile, addresses, draft, stepDone, override, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}

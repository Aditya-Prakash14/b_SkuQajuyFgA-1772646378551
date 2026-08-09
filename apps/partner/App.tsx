import './global.css'

import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import type { Session } from '@supabase/supabase-js'

import { Banner, Button, Loading, Screen } from './src/components/ui'
import { errorMessage, supabase } from './src/lib/supabase'
import { space } from './src/lib/theme'
import type { Vendor } from './src/lib/types'
import { ClaimScreen } from './src/screens/ClaimScreen'
import { DocumentsScreen } from './src/screens/DocumentsScreen'
import { ProfileScreen } from './src/screens/ProfileScreen'
import { SignInScreen } from './src/screens/SignInScreen'
import { StatusScreen } from './src/screens/StatusScreen'

/**
 * There is no router here on purpose. Onboarding is a strictly linear wizard
 * whose position is owned by the database (vendors.onboarding_step), not by
 * navigation history — a partner who reinstalls the app must land exactly where
 * they left off. Deriving the screen from the vendor row makes that automatic
 * and removes a whole class of "back button desyncs the server state" bugs.
 */
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loadingVendor, setLoadingVendor] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when a rejected partner taps "update documents", to override the
  // server's 'review' cursor for this session only.
  const [forceDocuments, setForceDocuments] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setBooting(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) setVendor(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadVendor = useCallback(async () => {
    if (!session) return
    setLoadingVendor(true)
    setError(null)
    try {
      // RLS "vendor reads own row" scopes this to the caller; maybeSingle()
      // because a brand-new account legitimately has no vendor row yet.
      const { data, error } = await supabase
        .from('vendors')
        .select(
          'id, name, phone, email, city, status, services_offered, application_note, onboarding_step, submitted_at, rejection_reason',
        )
        .eq('auth_user_id', session.user.id)
        .maybeSingle()
      if (error) throw error
      setVendor((data as Vendor | null) ?? null)
    } catch (err) {
      setError(errorMessage(err, 'Could not load your partner profile.'))
    } finally {
      setLoadingVendor(false)
    }
  }, [session])

  useEffect(() => {
    if (session) loadVendor()
  }, [session, loadVendor])

  function body() {
    if (booting) return <Loading />
    if (!session) return <SignInScreen />
    if (loadingVendor && !vendor) return <Loading label="Loading your application…" />

    if (error) {
      return (
        <View style={{ padding: space(5), gap: space(4) }}>
          <Screen title="Something went wrong">
            <Banner tone="error">{error}</Banner>
            <Button label="Try again" onPress={loadVendor} />
            <Button label="Sign out" variant="ghost" onPress={() => supabase.auth.signOut()} />
          </Screen>
        </View>
      )
    }

    if (!vendor) {
      return <ClaimScreen email={session.user.email ?? ''} onClaimed={loadVendor} />
    }

    if (forceDocuments) {
      return <DocumentsScreen vendor={vendor} onSubmitted={() => { setForceDocuments(false); loadVendor() }} />
    }

    switch (vendor.onboarding_step) {
      case 'profile':
        return <ProfileScreen vendor={vendor} onSaved={loadVendor} />
      case 'documents':
        return <DocumentsScreen vendor={vendor} onSubmitted={loadVendor} />
      default:
        return (
          <StatusScreen
            vendor={vendor}
            onFixDocuments={() => setForceDocuments(true)}
            onSignOut={() => supabase.auth.signOut()}
          />
        )
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

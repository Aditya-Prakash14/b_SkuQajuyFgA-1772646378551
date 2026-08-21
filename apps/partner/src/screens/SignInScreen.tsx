import { useState } from 'react'
import { Text, View } from 'react-native'

import { Banner, Button, Card, Field, Screen } from '../components/ui'
import { errorMessage, supabase } from '../lib/supabase'
import { colors, space } from '../lib/theme'

/**
 * Email + password sign-in, no verification email.
 *
 * Email delivery (OTP codes, magic links) proved unreliable on the stock
 * Supabase sender — capped at ~2 emails/hour and often dropped by Gmail — so
 * for now nothing here depends on an inbox. One button does both jobs: it
 * signs in, and if the email is new it creates the account and signs in
 * immediately. That instant sign-up requires "Confirm email" to be OFF in
 * Supabase → Authentication → Providers → Email; with it on, sign-up returns
 * no session and the partner is told so.
 *
 * Deliberately not Google OAuth (which apps/web uses): that needs native client
 * IDs per build, which a partner-facing APK cannot assume.
 *
 * The phone number is still the partner's identity: it is collected on the next
 * screen and is what claim_vendor() matches against.
 */
export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function continueWithPassword() {
    const e = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setError('Enter a valid email address')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // 1. Existing account → straight in.
      const signIn = await supabase.auth.signInWithPassword({ email: e, password })
      if (!signIn.error) return // App.tsx swaps the screen on onAuthStateChange.

      // Anything other than "wrong credentials" is a real failure — surface it.
      if (!/invalid login credentials/i.test(signIn.error.message)) throw signIn.error

      // 2. Unknown email → create the account. With email confirmation off,
      //    Supabase returns a live session here and we're done.
      const signUp = await supabase.auth.signUp({ email: e, password })
      if (signUp.error) throw signUp.error
      if (signUp.data.session) return

      // Supabase returns an "obfuscated" user with no identities when the email
      // already exists — which means the password above was simply wrong.
      const exists = signUp.data.user && (signUp.data.user.identities?.length ?? 0) === 0
      setError(
        exists
          ? 'Wrong password for this email. Try again.'
          : 'Account created, but email confirmation is still switched on in Supabase. ' +
              'Turn off "Confirm email" (Authentication → Providers → Email) and sign in again.',
      )
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in. Check the details and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      title="Partner sign in"
      subtitle="Join MyPrimeCompany as a service partner. New here? Pick a password and we'll create your account on the spot."
    >
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card>
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          onSubmitEditing={continueWithPassword}
        />
        <Button label="Continue" onPress={continueWithPassword} loading={busy} />
      </Card>

      <View style={{ paddingHorizontal: space(2) }}>
        <Text style={{ fontSize: 12, color: colors.faint, lineHeight: 18, textAlign: 'center' }}>
          By continuing you agree to a background verification check before your
          account is activated.
        </Text>
      </View>
    </Screen>
  )
}

import { useState } from 'react'
import { Text, View } from 'react-native'

import { Banner, Button, Card, Field, Screen } from '../components/ui'
import { errorMessage, supabase } from '../lib/supabase'
import { colors, space } from '../lib/theme'

/**
 * Email OTP sign-in.
 *
 * Deliberately not Google OAuth (which apps/web uses): that needs native client
 * IDs and a custom scheme per build, which a partner-facing APK cannot assume.
 * Deliberately not phone OTP either — that needs a paid SMS provider wired into
 * Supabase Auth. Email OTP works on a stock project with no extra setup.
 *
 * The phone number is still the partner's identity: it is collected on the next
 * screen and is what claim_vendor() matches against.
 */
export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not send the code. Check the email and try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (token.trim().length < 6) {
      setError('Enter the 6-digit code from your email')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email',
      })
      if (error) throw error
      // No navigation here: App.tsx listens on onAuthStateChange and swaps the
      // screen as soon as the session lands.
    } catch (err) {
      setError(errorMessage(err, 'That code was not accepted. Request a new one.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      title="Partner sign in"
      subtitle={
        sent
          ? `We sent a 6-digit code to ${email.trim()}. It expires in a few minutes.`
          : 'Join MyPrimeCompany as a service partner. Sign in to start or resume your application.'
      }
    >
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card>
        {!sent ? (
          <>
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
            <Button label="Send code" onPress={sendCode} loading={busy} />
          </>
        ) : (
          <>
            <Field
              label="6-digit code"
              value={token}
              onChangeText={(t) => setToken(t.replace(/\D/g, ''))}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoFocus
            />
            <Button label="Verify and continue" onPress={verify} loading={busy} />
            <Button
              label="Use a different email"
              variant="ghost"
              onPress={() => {
                setSent(false)
                setToken('')
                setError(null)
              }}
            />
          </>
        )}
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

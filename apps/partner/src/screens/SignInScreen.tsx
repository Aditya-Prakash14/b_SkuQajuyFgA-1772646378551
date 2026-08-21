import { useState } from 'react'
import { Text, View } from 'react-native'

import { Banner, Button, Card, Field, Screen } from '../components/ui'
import { authRedirectUrl, errorMessage, supabase } from '../lib/supabase'
import { colors, space } from '../lib/theme'

/**
 * Magic-link sign-in.
 *
 * The partner enters an email and taps the link we send; the link deep-links
 * back into this app and App.tsx turns it into a session. No code to type —
 * Supabase's stock "Magic Link" email carries a link, not a token, so a code
 * field only ever confused people.
 *
 * Deliberately not Google OAuth (which apps/web uses): that needs native client
 * IDs per build, which a partner-facing APK cannot assume. Deliberately not
 * phone OTP either — that needs a paid SMS provider wired into Supabase Auth.
 *
 * The phone number is still the partner's identity: it is collected on the next
 * screen and is what claim_vendor() matches against.
 */
export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendLink() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          // Where the emailed link lands: exp://<host>/--/auth/callback in Expo
          // Go, primepartner://auth/callback in a store build. Must be on the
          // Supabase Auth redirect allow-list or the link falls back to the
          // website instead of the app.
          emailRedirectTo: authRedirectUrl(),
        },
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not send the link. Check the email and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      title="Partner sign in"
      subtitle={
        sent
          ? `We emailed a sign-in link to ${email.trim()}. Open it on this phone — check spam if it doesn't arrive.`
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
            <Button label="Email me a sign-in link" onPress={sendLink} loading={busy} />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
              Tap the link in the email and you'll land back here, signed in. The
              link works once and expires in an hour.
            </Text>
            <Button label="Resend link" variant="ghost" onPress={sendLink} loading={busy} />
            <Button
              label="Use a different email"
              variant="ghost"
              onPress={() => {
                setSent(false)
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

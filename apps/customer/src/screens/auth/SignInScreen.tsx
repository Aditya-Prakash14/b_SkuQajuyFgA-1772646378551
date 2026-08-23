import { useState } from 'react'
import { Linking, View } from 'react-native'

import { PRIVACY_URL, TERMS_URL } from '../account/HelpScreen'

import { Banner, Body, Button, Divider, Eyebrow, Field, H1, Muted, Screen, Text } from '../../components/ui'
import {
  PHONE_OTP_ENABLED,
  errorMessage,
  sendPhoneOtp,
  signInWithEmail,
  signInWithGoogle,
} from '../../lib/supabase'

/**
 * Screen 5.
 *
 * Three paths, in order of what actually works today:
 *   • Email + password — no redirect, no provider setup, works everywhere.
 *   • Google — needs this device's redirect URL on Supabase's allow-list, which
 *     is easy to get wrong and fails by opening the website instead.
 *   • Phone OTP — the spec's first choice, gated behind PHONE_OTP_ENABLED until
 *     an SMS provider exists, so the form is hidden rather than broken.
 */
export function SignInScreen({ onCodeSent }: { onCodeSent: (phone: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState<'email' | 'google' | 'phone' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function withEmail() {
    const e = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy('email')
    setError(null)
    try {
      await signInWithEmail(e, password)
      // No navigation here: the session listener swaps the screen.
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in.'))
    } finally {
      setBusy(null)
    }
  }

  async function google() {
    setBusy('google')
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in with Google.'))
    } finally {
      setBusy(null)
    }
  }

  async function phoneOtp() {
    if (phone.length < 10) {
      setError('Enter your 10-digit mobile number.')
      return
    }
    setBusy('phone')
    setError(null)
    try {
      await sendPhoneOtp(phone)
      onCodeSent(phone)
    } catch (err) {
      setError(errorMessage(err, 'Could not send the code.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Screen>
      <Body>
        <View className="gap-3 pt-6">
          <Eyebrow className="text-primary">Welcome</Eyebrow>
          <H1>Sign in to book</H1>
          <Muted>Your bookings, addresses and receipts stay with your account.</Muted>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        {PHONE_OTP_ENABLED ? (
          <View className="gap-3">
            <View className="flex-row items-end gap-2">
              <View className="h-[52px] justify-center rounded-md border border-input bg-card px-4">
                <Text className="font-semibold text-[15px] text-foreground">+91</Text>
              </View>
              <Field
                label="Mobile number"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                placeholder="10-digit mobile"
                className="flex-1"
              />
            </View>
            <Button label="Send code" onPress={phoneOtp} loading={busy === 'phone'} />
            <Splitter />
          </View>
        ) : null}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          onSubmitEditing={withEmail}
        />
        <Button label="Continue" onPress={withEmail} loading={busy === 'email'} />

        <Splitter />

        <Button
          label="Continue with Google"
          variant="outline"
          onPress={google}
          loading={busy === 'google'}
        />

        <Muted className="pt-2 text-center text-[12px]">
          By continuing you agree to our{' '}
          <Text className="text-[12px] text-primary" onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text className="text-[12px] text-primary" onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
            Privacy Policy
          </Text>
          .
        </Muted>

        <View className="items-center pt-6">
          <Eyebrow>Secured by Supabase Auth</Eyebrow>
        </View>
      </Body>
    </Screen>
  )
}

function Splitter() {
  return (
    <View className="flex-row items-center gap-3 py-1">
      <Divider className="flex-1" />
      <Eyebrow>or</Eyebrow>
      <Divider className="flex-1" />
    </View>
  )
}

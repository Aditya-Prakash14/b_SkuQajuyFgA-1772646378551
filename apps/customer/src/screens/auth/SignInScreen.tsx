import { useState } from 'react'
import { View } from 'react-native'

import { Banner, Body, Button, Divider, Eyebrow, Field, H1, Muted, Screen, Text } from '../../components/ui'
import { PHONE_OTP_ENABLED, errorMessage, sendPhoneOtp, signInWithGoogle } from '../../lib/supabase'

/**
 * Screen 5. Phone-first per the spec, but phone OTP needs an SMS provider
 * configured in Supabase; until then PHONE_OTP_ENABLED is false and the form is
 * hidden rather than offering something that cannot work. Google is the live
 * path and matches the identity customers already use on the website, so one
 * person stays one account across web and app.
 */
export function SignInScreen({ onCodeSent }: { onCodeSent: (phone: string) => void }) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState<'google' | 'phone' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function google() {
    setBusy('google')
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      const msg = errorMessage(err, 'Could not sign in with Google.')
      // Backing out of the browser is not a failure worth shouting about.
      if (!/cancel/i.test(msg)) setError(msg)
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
        <View className="pt-6 gap-3">
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
            <Button label="Continue" onPress={phoneOtp} loading={busy === 'phone'} />

            <View className="flex-row items-center gap-3 py-1">
              <Divider className="flex-1" />
              <Eyebrow>or</Eyebrow>
              <Divider className="flex-1" />
            </View>
          </View>
        ) : null}

        <Button label="Continue with Google" variant="outline" onPress={google} loading={busy === 'google'} />

        {!PHONE_OTP_ENABLED ? (
          <Muted className="text-center">
            Sign-in by mobile number is coming soon.
          </Muted>
        ) : null}

        <Muted className="pt-2 text-center text-[12px]">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Muted>

        <View className="items-center pt-6">
          <Eyebrow>Secured by Supabase Auth</Eyebrow>
        </View>
      </Body>
    </Screen>
  )
}

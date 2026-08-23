import { useEffect, useRef, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'

import { Banner, Body, Button, Eyebrow, H1, Muted, Screen, Text } from '../../components/ui'
import { useColors } from '../../lib/theme'
import { errorMessage, sendPhoneOtp, verifyPhoneOtp } from '../../lib/supabase'

const LENGTH = 6
const RESEND_SECONDS = 30

/**
 * Screen 6. Six boxes backed by a single hidden input — typing, pasting and
 * autofill all behave, which per-box inputs famously do not.
 *
 * Only reachable when PHONE_OTP_ENABLED is true.
 */
export function VerifyCodeScreen({ phone, onBack }: { phone: string; onBack: () => void }) {
  const colors = useColors()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState(RESEND_SECONDS)
  const input = useRef<TextInput>(null)

  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(t)
  }, [left])

  useEffect(() => {
    if (code.length === LENGTH) verify(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function verify(value: string) {
    setBusy(true)
    setError(null)
    try {
      await verifyPhoneOtp(phone, value)
      // No navigation here: the session listener swaps the screen.
    } catch (err) {
      setError(errorMessage(err, 'That code was not accepted. Request a new one.'))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    try {
      await sendPhoneOtp(phone)
      setLeft(RESEND_SECONDS)
    } catch (err) {
      setError(errorMessage(err, 'Could not resend the code.'))
    }
  }

  return (
    <Screen>
      <Body>
        <View className="pt-6 gap-3">
          <Eyebrow className="text-primary">Verify</Eyebrow>
          <H1>Enter the code</H1>
          <Muted>We sent a {LENGTH}-digit code to +91 {phone}.</Muted>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <Pressable onPress={() => input.current?.focus()} className="flex-row justify-between gap-2 pt-2">
          {Array.from({ length: LENGTH }, (_, i) => {
            const char = code[i]
            const focused = i === code.length
            return (
              <View
                key={i}
                className="h-[58px] flex-1 items-center justify-center rounded-md border bg-card"
                style={{ borderColor: focused ? colors.brand : colors.border, borderWidth: focused ? 2 : 1 }}
              >
                <Text className="font-bold text-[22px] text-foreground">{char ?? ''}</Text>
              </View>
            )
          })}
        </Pressable>

        <TextInput
          ref={input}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, LENGTH))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          maxLength={LENGTH}
          // Off-screen rather than display:none — a hidden input cannot focus.
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        />

        <Button label="Verify" onPress={() => verify(code)} loading={busy} disabled={code.length < LENGTH} />

        {left > 0 ? (
          <Muted className="text-center">Resend the code in {left}s</Muted>
        ) : (
          <Pressable onPress={resend} accessibilityRole="button" className="items-center py-2">
            <Text className="font-bold text-[14px] text-primary">Resend code</Text>
          </Pressable>
        )}

        <Pressable onPress={onBack} accessibilityRole="button" className="items-center py-2">
          <Text className="font-medium text-[14px] text-muted-foreground">Use a different number</Text>
        </Pressable>
      </Body>
    </Screen>
  )
}

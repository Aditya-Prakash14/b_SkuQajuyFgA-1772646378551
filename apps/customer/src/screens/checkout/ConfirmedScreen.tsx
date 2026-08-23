import { useState } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Card, Eyebrow, Muted, Text } from '../../components/ui'
import { ONLINE_PAYMENTS_ENABLED, startOnlinePayment, type PaymentOutcome } from '../../lib/payments'
import { errorMessage } from '../../lib/supabase'
import { useColors } from '../../lib/theme'
import type { CartStackProps } from '../../navigation/types'

/**
 * Screen 20. Teal success screen with the receipt reference — and, when the
 * customer chose to pay now and Razorpay is live, the payment itself.
 */
export function ConfirmedScreen({ route, navigation }: CartStackProps<'Confirmed'>) {
  const colors = useColors()
  const { reference, payNow } = route.params
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canPay = ONLINE_PAYMENTS_ENABLED && !!payNow && outcome !== 'success'

  async function pay() {
    if (!payNow) return
    setPaying(true)
    setError(null)
    try {
      setOutcome(await startOnlinePayment(payNow.kind, payNow.id))
    } catch (err) {
      setError(errorMessage(err, 'Could not start the payment. You can still pay after the work.'))
    } finally {
      setPaying(false)
    }
  }

  const blurb =
    outcome === 'success'
      ? 'Payment received. We will call you to confirm the arrival window.'
      : canPay
        ? 'Pay now to settle it, or pay after the work — both are fine.'
        : 'We will call you to confirm the arrival window. Your helper is assigned closer to the day.'

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: colors.deep }}>
      <View className="flex-1 items-center justify-center gap-6 px-[22px]">
        <View className="h-20 w-20 items-center justify-center rounded-pill bg-white/15">
          <Text className="font-black text-[34px] text-white">✓</Text>
        </View>

        <View className="items-center gap-2">
          <Text className="text-center font-black text-[28px] text-white" style={{ letterSpacing: -0.8 }}>
            Booking confirmed
          </Text>
          <Text className="text-center font-sans text-[14px] leading-[21px] text-white/80">{blurb}</Text>
        </View>

        <Card className="w-full border-0">
          <Eyebrow>Booking reference</Eyebrow>
          <Text className="mt-1 font-mono text-[20px] text-foreground">{reference}</Text>
          <Muted className="mt-2 text-[12px]">Quote this if you call us about the booking.</Muted>
          {outcome === 'cancelled' ? <Muted className="mt-2 text-[12px]">Payment not completed — you can try again or pay after the work.</Muted> : null}
          {outcome === 'failed' ? <Muted className="mt-2 text-[12px] text-destructive">The payment did not go through. Nothing was charged.</Muted> : null}
          {error ? <Muted className="mt-2 text-[12px] text-destructive">{error}</Muted> : null}
        </Card>
      </View>

      <View className="gap-2 px-[22px] pb-2">
        {canPay ? (
          <Button
            label={outcome === 'cancelled' || outcome === 'failed' ? 'Try the payment again' : 'Pay now'}
            variant="brand"
            onPress={pay}
            loading={paying}
          />
        ) : null}
        <Button
          label="Track my booking"
          variant={canPay ? 'ghost' : 'brand'}
          onPress={() => navigation.getParent()?.navigate('BookingsTab' as never)}
        />
        <Button
          label="Back to home"
          variant="ghost"
          onPress={() => {
            // Leave the cart tab on its (now empty) root so it never reopens on this screen.
            navigation.popToTop()
            navigation.getParent()?.navigate('HomeTab' as never)
          }}
        />
      </View>
    </SafeAreaView>
  )
}

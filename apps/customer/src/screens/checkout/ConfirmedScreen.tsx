import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Card, Eyebrow, Muted, Text } from '../../components/ui'
import { useColors } from '../../lib/theme'
import type { HomeStackProps } from '../../navigation/types'

/** Screen 20. Teal success screen with the receipt reference. */
export function ConfirmedScreen({ route, navigation }: HomeStackProps<'Confirmed'>) {
  const colors = useColors()
  const { reference } = route.params

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
          <Text className="text-center font-sans text-[14px] leading-[21px] text-white/80">
            We will call you to confirm the arrival window. Your helper is assigned closer to the day.
          </Text>
        </View>

        <Card className="w-full border-0">
          <Eyebrow>Booking reference</Eyebrow>
          <Text className="mt-1 font-mono text-[20px] text-foreground">{reference}</Text>
          <Muted className="mt-2 text-[12px]">
            Quote this if you call us about the booking.
          </Muted>
        </Card>
      </View>

      <View className="gap-2 px-[22px] pb-2">
        <Button
          label="Track my booking"
          variant="brand"
          onPress={() => navigation.getParent()?.navigate('BookingsTab' as never)}
        />
        <Button label="Back to home" variant="ghost" onPress={() => navigation.popToTop()} />
      </View>
    </SafeAreaView>
  )
}

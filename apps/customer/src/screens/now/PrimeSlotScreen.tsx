import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Body, Button, Card, Eyebrow, H1, Muted, Screen, Text } from '../../components/ui'
import { track } from '../../lib/analytics'
import { formatINR } from '../../lib/format'
import { GUARANTEES, getSlots, refreshSlots, type SlotId } from '../../lib/prime-now'
import { useColors } from '../../lib/theme'
import type { HomeStackProps } from '../../navigation/types'

/** Screen 14. How long do you need someone for. */
export function PrimeSlotScreen({ navigation }: HomeStackProps<'PrimeSlot'>) {
  const colors = useColors()
  // CRM-controlled price list: render the cache at once, refresh in place.
  const [slots, setSlots] = useState(getSlots())
  const [slot, setSlot] = useState<SlotId>('1h')
  useEffect(() => {
    let mounted = true
    refreshSlots().then((next) => {
      if (!mounted) return
      setSlots(next)
      setSlot((cur) => (next.some((s) => s.id === cur) ? cur : next[0].id))
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="flash" size={13} color={colors.primary} />
            <Eyebrow className="text-primary">Prime Now · step 1 of 3</Eyebrow>
          </View>
          <H1>How long do you need help for?</H1>
          <Muted>A flat price for the slot. No travel fee and no surge.</Muted>
        </View>

        <View className="gap-3">
          {slots.map((s) => {
            const active = s.id === slot
            return (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSlot(s.id)}
                className={
                  active
                    ? 'flex-row items-center justify-between rounded-lg border-2 border-primary bg-secondary p-4'
                    : 'flex-row items-center justify-between rounded-lg border border-border bg-card p-4 active:opacity-85'
                }
              >
                <View>
                  <Text className="font-bold text-[16px] text-foreground">{s.label}</Text>
                  <Muted className="text-[12px]">{s.sublabel}</Muted>
                </View>
                <Text className="font-black text-[19px] text-foreground">{formatINR(s.price)}</Text>
              </Pressable>
            )
          })}
        </View>

        <Card className="gap-2 bg-secondary">
          {GUARANTEES.map((g) => (
            <View key={g} className="flex-row gap-2.5">
              <Text className="font-bold text-[13px] text-primary">✓</Text>
              <Text className="flex-1 font-medium text-[13px] leading-5 text-foreground">{g}</Text>
            </View>
          ))}
        </Card>

        <Button
          label="Continue"
          onPress={() => {
            track('prime_now_slot_selected', { slot })
            navigation.navigate('PrimeDescribe', { slot })
          }}
        />
      </Body>
    </Screen>
  )
}

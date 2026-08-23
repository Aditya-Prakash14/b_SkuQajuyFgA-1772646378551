import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Body, Button, Card, Eyebrow, H1, Muted, Screen, Text } from '../../components/ui'
import { formatINR } from '../../lib/format'
import { GUARANTEES, SLOTS, type SlotId } from '../../lib/prime-now'
import type { HomeStackProps } from '../../navigation/types'

/** Screen 14. How long do you need someone for. */
export function PrimeSlotScreen({ navigation }: HomeStackProps<'PrimeSlot'>) {
  const [slot, setSlot] = useState<SlotId>('1h')

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <Eyebrow className="text-primary">Domain 02 · step 1 of 3</Eyebrow>
          <H1>How long do you need help for?</H1>
          <Muted>A flat price for the slot. No travel fee and no surge.</Muted>
        </View>

        <View className="gap-3">
          {SLOTS.map((s) => {
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

        <Button label="Continue" onPress={() => navigation.navigate('PrimeDescribe', { slot })} />
      </Body>
    </Screen>
  )
}

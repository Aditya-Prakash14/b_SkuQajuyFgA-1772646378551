import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { type ComponentProps, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Body, Button, Eyebrow, Field, H1, Muted, Screen, Text } from '../../components/ui'
import { TASKS } from '../../lib/prime-now'
import { useColors } from '../../lib/theme'
import type { HomeStackProps } from '../../navigation/types'

type MCIName = ComponentProps<typeof MaterialCommunityIcons>['name']

/**
 * Screen 15 — now the FIRST step of Prime Now: pick what needs doing, then
 * how long (the slot screen follows). The task cards are a convenience, not a
 * taxonomy — the helper reads the list, and the freeform note carries anything
 * the cards miss. Nothing here changes the price: Prime Now is a flat hourly
 * rate with no per-task add-ons.
 */
export function PrimeDescribeScreen({ navigation }: HomeStackProps<'PrimeDescribe'>) {
  const colors = useColors()
  const [tasks, setTasks] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const toggle = (id: string) =>
    setTasks((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="flash" size={13} color={colors.primary} />
            <Eyebrow className="text-primary">Prime Now · step 1 of 3</Eyebrow>
          </View>
          <H1>What should they do?</H1>
          <Muted>Pick as many as you like. This does not change the price.</Muted>
        </View>

        <View className="flex-row flex-wrap gap-2.5">
          {TASKS.map((t) => {
            const selected = tasks.includes(t.id)
            return (
              <Pressable
                key={t.id}
                onPress={() => toggle(t.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={
                  selected
                    ? 'w-[31%] items-center gap-2 rounded-lg border-2 border-primary bg-secondary px-1.5 py-3.5'
                    : 'w-[31%] items-center gap-2 rounded-lg border border-border bg-card px-1.5 py-3.5 active:opacity-85'
                }
              >
                <MaterialCommunityIcons
                  name={t.icon as MCIName}
                  size={24}
                  color={selected ? colors.primary : colors.muted}
                />
                <Text
                  numberOfLines={2}
                  className={
                    selected
                      ? 'text-center font-bold text-[12px] leading-4 text-foreground'
                      : 'text-center font-medium text-[12px] leading-4 text-foreground'
                  }
                >
                  {t.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Field
          label="Anything else?"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. two bedrooms and a balcony, pets at home, please bring a mop."
          multiline
          numberOfLines={4}
          style={{ minHeight: 110, textAlignVertical: 'top' }}
        />

        <Button
          label="Continue"
          onPress={() => navigation.navigate('PrimeSlot', { tasks, notes: notes.trim() })}
        />
      </Body>
    </Screen>
  )
}

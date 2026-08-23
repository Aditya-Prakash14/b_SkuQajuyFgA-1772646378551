import { useState } from 'react'
import { View } from 'react-native'

import { Body, Button, Chip, Eyebrow, Field, H1, Muted, Screen } from '../../components/ui'
import { TASKS } from '../../lib/prime-now'
import type { HomeStackProps } from '../../navigation/types'

/**
 * Screen 15. What should they do.
 *
 * The chips are a convenience, not a taxonomy — the helper reads the list, and
 * the freeform note carries anything the chips miss. Nothing here changes the
 * price: Prime Now is a flat hourly rate with no per-task add-ons.
 */
export function PrimeDescribeScreen({ route, navigation }: HomeStackProps<'PrimeDescribe'>) {
  const { slot } = route.params
  const [tasks, setTasks] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const toggle = (id: string) =>
    setTasks((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <Eyebrow className="text-primary">Domain 02 · step 2 of 3</Eyebrow>
          <H1>What should they do?</H1>
          <Muted>Pick as many as you like. This does not change the price.</Muted>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {TASKS.map((t) => (
            <Chip key={t.id} label={t.label} selected={tasks.includes(t.id)} onPress={() => toggle(t.id)} />
          ))}
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
          onPress={() => navigation.navigate('PrimeWhen', { slot, tasks, notes: notes.trim() })}
        />
      </Body>
    </Screen>
  )
}

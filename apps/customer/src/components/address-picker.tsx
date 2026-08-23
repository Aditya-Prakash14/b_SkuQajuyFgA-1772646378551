import { Pressable, View } from 'react-native'

import type { Address } from '../lib/types'
import { Eyebrow, Muted, Text } from './ui'

/**
 * Saved addresses as a radio list, for checkout and Prime Now. The default is
 * preselected; adding a new one hands off to the address form, which returns
 * the new id so the screen can select it.
 */
export function AddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAdd,
}: {
  addresses: Address[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
}) {
  return (
    <View className="gap-2">
      <Eyebrow>Address</Eyebrow>
      {addresses.length === 0 ? <Muted className="text-[13px]">No address saved yet.</Muted> : null}
      {addresses.map((a) => {
        const active = a.id === selectedId
        return (
          <Pressable
            key={a.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${a.label ?? 'Address'}: ${a.full_address}, ${a.city}`}
            onPress={() => onSelect(a.id)}
            className={
              active ? 'rounded-md border-2 border-primary bg-secondary p-3' : 'rounded-md border border-border bg-card p-3'
            }
          >
            <Text className="font-bold text-[14px] text-foreground">
              {a.label ?? 'Address'}
              {a.is_default ? ' · default' : ''}
            </Text>
            <Muted className="text-[12px]">
              {a.full_address}, {a.city}
            </Muted>
          </Pressable>
        )
      })}
      <Pressable accessibilityRole="button" onPress={onAdd} className="min-h-[44px] justify-center">
        <Text className="font-bold text-[13px] text-primary">
          {addresses.length === 0 ? '+ Add an address' : '+ Add another address'}
        </Text>
      </Pressable>
    </View>
  )
}

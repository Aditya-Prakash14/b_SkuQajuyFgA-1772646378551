import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'

import { Banner, Body, Button, Card, Eyebrow, H1, Muted, Screen, Text } from '../../components/ui'
import { deleteAddress, setDefaultAddress } from '../../lib/bookings'
import { useSession } from '../../lib/session'
import { errorMessage } from '../../lib/supabase'
import type { AddressRouteProps } from '../../navigation/types'

/**
 * The address book. Edits go straight to the table under RLS; the 0028 index
 * guarantees a single default, so "set as default" is demote-then-promote.
 */
export function AddressesScreen({ navigation }: AddressRouteProps<'Addresses'>) {
  const { addresses, refresh } = useSession()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function makeDefault(id: string) {
    setBusy(id)
    setError(null)
    try {
      await setDefaultAddress(id)
      await refresh()
    } catch (err) {
      setError(errorMessage(err, 'Could not change the default address.'))
    } finally {
      setBusy(null)
    }
  }

  function confirmDelete(id: string, label: string) {
    Alert.alert(`Delete ${label}?`, 'Past bookings keep the address they were made with.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(id)
          setError(null)
          try {
            await deleteAddress(id)
            await refresh()
          } catch (err) {
            setError(errorMessage(err, 'Could not delete that address.'))
          } finally {
            setBusy(null)
          }
        },
      },
    ])
  }

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <H1>Addresses</H1>
          <Muted>Where we come to. The default is used for new bookings unless you pick another.</Muted>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        {addresses.length === 0 ? (
          <Card>
            <Text className="font-bold text-[15px] text-foreground">No address saved yet</Text>
            <Muted className="mt-1 text-[13px]">Add one and checkout will be a tap shorter.</Muted>
          </Card>
        ) : (
          <View className="gap-3">
            {addresses.map((a) => {
              const label = a.label ?? 'Address'
              const working = busy === a.id
              return (
                <Card key={a.id} className="gap-3">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-bold text-[15px] text-foreground">{label}</Text>
                        {a.is_default ? <Eyebrow className="text-primary">Default</Eyebrow> : null}
                      </View>
                      <Muted className="mt-1 text-[13px]">
                        {a.full_address}, {a.city}
                      </Muted>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap gap-x-5 gap-y-2">
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => navigation.navigate('AddressForm', { addressId: a.id })}
                      className="min-h-[44px] justify-center"
                    >
                      <Text className="font-bold text-[13px] text-primary">Edit</Text>
                    </Pressable>
                    {!a.is_default ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={working}
                        onPress={() => makeDefault(a.id)}
                        className="min-h-[44px] justify-center"
                      >
                        <Text className="font-bold text-[13px] text-primary">
                          {working ? 'Saving…' : 'Set as default'}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={working}
                      onPress={() => confirmDelete(a.id, label)}
                      className="min-h-[44px] justify-center"
                    >
                      <Text className="font-bold text-[13px] text-destructive">Delete</Text>
                    </Pressable>
                  </View>
                </Card>
              )
            })}
          </View>
        )}

        <Button label="Add an address" onPress={() => navigation.navigate('AddressForm', {})} />
      </Body>
    </Screen>
  )
}

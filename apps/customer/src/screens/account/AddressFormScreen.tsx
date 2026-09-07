import { useEffect, useState } from 'react'
import { Switch, View } from 'react-native'

import { Banner, Body, Button, Chip, Eyebrow, Field, H1, Muted, Screen, Text } from '../../components/ui'
import { saveMyAddress, setDefaultAddress, updateAddress } from '../../lib/bookings'
import { fetchCities } from '../../lib/catalog'
import { useSession } from '../../lib/session'
import { errorMessage } from '../../lib/supabase'
import { useColors } from '../../lib/theme'
import type { AddressLabel } from '../../lib/types'
import type { AddressRouteProps } from '../../navigation/types'

const LABELS: AddressLabel[] = ['Home', 'Work', 'Other']

/**
 * Add or edit one address. Used from the address book and from checkout —
 * when checkout opened it, the saved address is handed back as `addressId`
 * so the booking goes there without another tap.
 */
export function AddressFormScreen({ route, navigation }: AddressRouteProps<'AddressForm'>) {
  const { addressId, returnTo } = route.params ?? {}
  const { addresses, profile, draft, refresh } = useSession()
  const colors = useColors()
  const existing = addressId ? addresses.find((a) => a.id === addressId) : undefined

  const [label, setLabel] = useState<AddressLabel>(
    existing && LABELS.includes(existing.label as AddressLabel) ? (existing.label as AddressLabel) : 'Home',
  )
  const [line, setLine] = useState(existing?.full_address ?? '')
  const [city, setCity] = useState(existing?.city ?? '')
  const [cities, setCities] = useState<string[]>([])
  const [makeDefault, setMakeDefault] = useState(existing ? !!existing.is_default : addresses.length === 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCities()
      .then((c) => {
        setCities(c)
        setCity((prev) => prev || c[0] || '')
      })
      .catch(() => {})
  }, [])

  async function save() {
    if (line.trim().length < 6) {
      setError('Please enter the flat, building and street.')
      return
    }
    if (!city) {
      setError('Please pick your city.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let id = addressId
      if (existing) {
        await updateAddress(existing.id, { label, fullAddress: line, city })
        if (makeDefault && !existing.is_default) await setDefaultAddress(existing.id)
      } else {
        id = await saveMyAddress({
          label,
          fullAddress: line.trim(),
          city,
          isDefault: makeDefault,
          name: profile?.name || draft.name || null,
        })
      }
      await refresh()
      if (returnTo && id) {
        navigation.navigate({ name: returnTo, params: { addressId: id }, merge: true } as never)
      } else {
        navigation.goBack()
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not save that address.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <H1>{existing ? 'Edit address' : 'New address'}</H1>
          <Muted>We only serve the cities listed here today.</Muted>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <View className="flex-row gap-2">
          {LABELS.map((l) => (
            <Chip key={l} label={l} selected={label === l} onPress={() => setLabel(l)} />
          ))}
        </View>

        <Field
          label="Address"
          value={line}
          onChangeText={setLine}
          placeholder="Flat / house, building, street, landmark"
          multiline
          numberOfLines={3}
          style={{ minHeight: 92, textAlignVertical: 'top' }}
        />

        <View className="gap-1.5">
          <Eyebrow>City</Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {cities.map((c) => (
              <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
            ))}
          </View>
        </View>

        {addresses.length > 0 && !existing?.is_default ? (
          <View className="flex-row items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
            <View className="flex-1">
              <Text className="font-bold text-[14px] text-foreground">Use as default</Text>
              <Muted className="text-[12px]">New bookings start with this address.</Muted>
            </View>
            <Switch
              value={makeDefault}
              onValueChange={setMakeDefault}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel="Use as default address"
            />
          </View>
        ) : null}

        <Button label={existing ? 'Save changes' : 'Save address'} onPress={save} loading={busy} />
      </Body>
    </Screen>
  )
}

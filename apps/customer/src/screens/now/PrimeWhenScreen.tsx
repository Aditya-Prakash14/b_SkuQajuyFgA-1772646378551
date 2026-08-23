import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { AddressPicker } from '../../components/address-picker'
import {
  Banner,
  Button,
  Card,
  Chip,
  Eyebrow,
  Field,
  H1,
  Muted,
  Screen,
  StickyBar,
  Text,
} from '../../components/ui'
import { dateParts, formatINR, hourLabel, upcomingDays } from '../../lib/format'
import { SCHEDULE_HOURS, SLOTS, TASK_LABEL, createPrimeNowRequest, type SlotId } from '../../lib/prime-now'
import { useSession } from '../../lib/session'
import { errorMessage } from '../../lib/supabase'
import type { HomeStackProps } from '../../navigation/types'

/** Screen 16. When and where, with the price shown live. */
export function PrimeWhenScreen({ route, navigation }: HomeStackProps<'PrimeWhen'>) {
  const { slot, tasks, notes } = route.params
  const { addresses, defaultAddress, profile, draft } = useSession()

  const [timing, setTiming] = useState<'now' | 'scheduled'>('now')
  const [day, setDay] = useState<Date | null>(null)
  const [hour, setHour] = useState<number>(10)
  const [addressId, setAddressId] = useState<string | null>(defaultAddress?.id ?? null)
  const [phone, setPhone] = useState(profile?.phone && !profile.phone.startsWith('pending:') ? profile.phone : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chosen = useMemo(() => SLOTS.find((s) => s.id === (slot as SlotId))!, [slot])
  const days = useMemo(() => upcomingDays(10), [])

  useEffect(() => {
    const returned = route.params.addressId
    if (returned) setAddressId(returned)
  }, [route.params.addressId])
  useEffect(() => {
    if (!addresses.some((a) => a.id === addressId)) setAddressId(defaultAddress?.id ?? null)
  }, [addresses, addressId, defaultAddress])

  const address = addresses.find((a) => a.id === addressId) ?? defaultAddress

  async function submit() {
    if (!address) {
      setError('Add an address before booking.')
      return
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a 10-digit mobile number so the helper can reach you.')
      return
    }
    if (timing === 'scheduled' && !day) {
      setError('Pick the day you want the helper.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const when = day ? new Date(day) : null
      if (when) when.setHours(hour, 0, 0, 0)
      const res = await createPrimeNowRequest({
        name: profile?.name || draft.name || 'Customer',
        phone: phone.replace(/\D/g, ''),
        address: address.full_address,
        city: address.city,
        slot: slot as SlotId,
        tasks,
        notes: notes || null,
        timing,
        scheduledFor: timing === 'scheduled' && when ? when.toISOString() : null,
      })
      navigation.replace('PrimeMatching', { requestId: res.id, reference: res.request_number })
    } catch (err) {
      setError(errorMessage(err, 'Could not send the request.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 32, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Eyebrow className="text-primary">Domain 02 · step 3 of 3</Eyebrow>
          <H1>When and where?</H1>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <View className="flex-row gap-3">
          {(
            [
              { id: 'now', label: 'Right now', sub: 'Within the hour' },
              { id: 'scheduled', label: 'Schedule', sub: 'Pick a day and hour' },
            ] as const
          ).map((o) => {
            const active = timing === o.id
            return (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTiming(o.id)}
                className={
                  active
                    ? 'flex-1 rounded-lg border-2 border-primary bg-secondary p-4'
                    : 'flex-1 rounded-lg border border-border bg-card p-4 active:opacity-85'
                }
              >
                <Text className="font-bold text-[15px] text-foreground">{o.label}</Text>
                <Muted className="text-[12px]">{o.sub}</Muted>
              </Pressable>
            )
          })}
        </View>

        {timing === 'scheduled' ? (
          <>
            <View className="gap-2">
              <Eyebrow>Which day?</Eyebrow>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {days.map((d) => {
                  const p = dateParts(d)
                  const active = day?.toDateString() === d.toDateString()
                  return (
                    <Pressable
                      key={d.toISOString()}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setDay(new Date(d))}
                      className={
                        active
                          ? 'min-h-[72px] w-[62px] items-center justify-center rounded-md bg-ink'
                          : 'min-h-[72px] w-[62px] items-center justify-center rounded-md border border-border bg-card'
                      }
                    >
                      <Text className={active ? 'font-mono text-[11px] text-ink-foreground/70' : 'font-mono text-[11px] text-muted-foreground'}>
                        {p.dow}
                      </Text>
                      <Text className={active ? 'font-black text-[18px] text-ink-foreground' : 'font-black text-[18px] text-foreground'}>
                        {p.day}
                      </Text>
                      <Text className={active ? 'font-mono text-[11px] text-ink-foreground/70' : 'font-mono text-[11px] text-muted-foreground'}>
                        {p.month}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>
            <View className="gap-2">
              <Eyebrow>What time?</Eyebrow>
              <View className="flex-row flex-wrap gap-2">
                {SCHEDULE_HOURS.map((h) => (
                  <Chip key={h} label={hourLabel(h)} selected={hour === h} onPress={() => setHour(h)} />
                ))}
              </View>
              <Muted className="text-[11px]">The helper arrives around this time. We confirm on the call.</Muted>
            </View>
          </>
        ) : null}

        <AddressPicker
          addresses={addresses}
          selectedId={address?.id ?? null}
          onSelect={setAddressId}
          onAdd={() => navigation.navigate('AddressForm', { returnTo: 'PrimeWhen' })}
        />

        <Field
          label="Phone number"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          placeholder="10-digit mobile"
          hint="The helper calls this number when they arrive."
        />

        {tasks.length > 0 ? (
          <Card>
            <Eyebrow>What they will do</Eyebrow>
            <Muted className="mt-1.5 text-[13px]">{tasks.map((t) => TASK_LABEL[t] ?? t).join(' · ')}</Muted>
          </Card>
        ) : null}
      </ScrollView>

      <StickyBar>
        <View>
          <Text className="font-black text-[20px] text-foreground">{formatINR(chosen.price)}</Text>
          <Eyebrow>{chosen.label}</Eyebrow>
        </View>
        <Button label="Find me a helper" onPress={submit} loading={busy} className="flex-1" />
      </StickyBar>
    </Screen>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { AddressPicker } from '../../components/address-picker'
import {
  Banner,
  Button,
  Eyebrow,
  Field,
  H1,
  Muted,
  Screen,
  StickyBar,
  Text,
} from '../../components/ui'
import { createBooking } from '../../lib/bookings'
import { useCart } from '../../lib/cart'
import { dateKey, dateParts, formatINR, upcomingDays } from '../../lib/format'
import { useSession } from '../../lib/session'
import { errorMessage } from '../../lib/supabase'
import { ANY_TIME_WINDOW, TIME_WINDOWS } from '../../lib/types'
import type { HomeStackProps } from '../../navigation/types'

/** The same windows the website offers, plus its "any time" option. */
const WINDOWS = [...TIME_WINDOWS, ANY_TIME_WINDOW]

/**
 * Screen 19. Date strip, arrival window, address, payment method.
 *
 * Payment is cash or UPI on completion: there is no online payment gateway
 * wired up, so offering "Pay now" would be a button that cannot charge. When
 * Razorpay exists this is where it slots in.
 */
export function SlotPaymentScreen({ route, navigation }: HomeStackProps<'SlotPayment'>) {
  const { lines, total, clear } = useCart()
  const hasPerUnit = lines.some((l) => l.priceUnit !== 'fixed')
  const { addresses, defaultAddress, profile, draft } = useSession()

  const days = useMemo(() => upcomingDays(14), [])
  const [day, setDay] = useState<Date>(days[0])
  const [window, setWindow] = useState<string>(WINDOWS[0])
  const [method, setMethod] = useState<'upi' | 'cash'>('upi')
  const [addressId, setAddressId] = useState<string | null>(defaultAddress?.id ?? null)
  const [phone, setPhone] = useState(profile?.phone && !profile.phone.startsWith('pending:') ? profile.phone : '')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // An address added from here comes back as a param; otherwise fall back to
  // the default when the chosen one disappears.
  useEffect(() => {
    const returned = route.params?.addressId
    if (returned) setAddressId(returned)
  }, [route.params?.addressId])
  useEffect(() => {
    if (!addresses.some((a) => a.id === addressId)) setAddressId(defaultAddress?.id ?? null)
  }, [addresses, addressId, defaultAddress])

  const address = addresses.find((a) => a.id === addressId) ?? defaultAddress

  async function confirm() {
    if (!address) {
      setError('Add an address before booking.')
      return
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a 10-digit mobile number.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await createBooking({
        name: profile?.name || draft.name || 'Customer',
        phone: phone.replace(/\D/g, ''),
        email: profile?.email || draft.email || '',
        city: address.city,
        address: address.full_address,
        date: dateKey(day),
        slot: window === ANY_TIME_WINDOW ? null : window,
        notes: notes.trim() || null,
        lines,
      })
      clear()
      navigation.replace('Confirmed', { reference: res.order_number })
    } catch (err) {
      setError(errorMessage(err, 'Could not confirm the booking.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 32, gap: 16 }} keyboardShouldPersistTaps="handled">
        <H1>When suits you?</H1>

        {error ? <Banner>{error}</Banner> : null}

        <View className="gap-2">
          <Eyebrow>Date</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((d) => {
              const p = dateParts(d)
              const active = day.toDateString() === d.toDateString()
              return (
                <Pressable
                  key={d.toISOString()}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setDay(new Date(d))}
                  className={
                    active
                      ? 'min-h-[74px] w-[62px] items-center justify-center rounded-md bg-ink'
                      : 'min-h-[74px] w-[62px] items-center justify-center rounded-md border border-border bg-card'
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
          <Eyebrow>Arrival window</Eyebrow>
          {WINDOWS.map((w) => {
            const active = window === w
            return (
              <Pressable
                key={w}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setWindow(w)}
                className={
                  active
                    ? 'min-h-[52px] justify-center rounded-md border-2 border-primary bg-secondary px-4'
                    : 'min-h-[52px] justify-center rounded-md border border-border bg-card px-4'
                }
              >
                <Text className="font-medium text-[14px] text-foreground">{w}</Text>
              </Pressable>
            )
          })}
        </View>

        <AddressPicker
          addresses={addresses}
          selectedId={address?.id ?? null}
          onSelect={setAddressId}
          onAdd={() => navigation.navigate('AddressForm', { returnTo: 'SlotPayment' })}
        />

        <View className="gap-2">
          <Eyebrow>Payment</Eyebrow>
          {(
            [
              { id: 'upi', label: 'UPI on completion', sub: 'Pay the helper by UPI once the work is done.' },
              { id: 'cash', label: 'Cash on completion', sub: 'Pay in cash after the job.' },
            ] as const
          ).map((m) => {
            const active = method === m.id
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMethod(m.id)}
                className={
                  active
                    ? 'rounded-md border-2 border-primary bg-secondary p-4'
                    : 'rounded-md border border-border bg-card p-4'
                }
              >
                <Text className="font-bold text-[15px] text-foreground">{m.label}</Text>
                <Muted className="text-[12px]">{m.sub}</Muted>
              </Pressable>
            )
          })}
          <Muted className="text-[11px]">Online payment is coming soon.</Muted>
        </View>

        <Field
          label="Phone number"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          placeholder="10-digit mobile"
        />

        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Parking, pets, anything the crew should know."
          multiline
          numberOfLines={3}
          style={{ minHeight: 88, textAlignVertical: 'top' }}
        />
      </ScrollView>

      <StickyBar>
        <View>
          <Text className="font-black text-[20px] text-foreground">{formatINR(total)}</Text>
          <Eyebrow>{hasPerUnit ? 'Estimated · incl. GST' : 'Incl. 18% GST'}</Eyebrow>
        </View>
        <Button label="Confirm booking" onPress={confirm} loading={busy} className="flex-1" />
      </StickyBar>
    </Screen>
  )
}

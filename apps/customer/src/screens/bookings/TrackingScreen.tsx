import { useCallback, useEffect, useState } from 'react'
import { Linking, ScrollView, View } from 'react-native'

import { Badge, Button, Card, Divider, Eyebrow, H1, Muted, Refresher, Screen, Text } from '../../components/ui'
import { cancelBooking, fetchBookingEvents } from '../../lib/bookings'
import { formatDay, formatINR, formatStamp } from '../../lib/format'
import { errorMessage, supabase } from '../../lib/supabase'
import { STATUS_LABEL, TIMELINE_STEPS, type BookingEvent } from '../../lib/types'
import type { BookingsStackProps } from '../../navigation/types'

const SUPPORT_PHONE = '917349603429'

/**
 * Screen 21. Status timeline, booking detail, and the actions that apply.
 *
 * The timeline is a projection of `booking_events` — written by a trigger on
 * every status change from any source — so it can never disagree with the
 * booking's real state the way client-side guessing would.
 *
 * No helper card or live map yet: a customer has no RLS path to `vendors`, and
 * nothing reports helper GPS. Both need a booking-scoped RPC and partner-side
 * location before they would show anything true.
 */
export function TrackingScreen({ route, navigation }: BookingsStackProps<'Tracking'>) {
  const { booking } = route.params
  const [events, setEvents] = useState<BookingEvent[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(booking.status)

  const load = useCallback(async () => {
    if (booking.kind !== 'deep') return
    setRefreshing(true)
    try {
      setEvents(await fetchBookingEvents(booking.id))
    } catch (err) {
      setError(errorMessage(err, 'Could not load the timeline.'))
    } finally {
      setRefreshing(false)
    }
  }, [booking.id, booking.kind])

  useEffect(() => {
    load()
  }, [load])

  // Live updates: the customer sees a status change the moment ops or the
  // helper makes it, without pulling to refresh.
  useEffect(() => {
    if (booking.kind !== 'deep') return
    const channel = supabase
      .channel(`booking:${booking.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_events', filter: `order_id=eq.${booking.id}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [booking.id, booking.kind, load])

  useEffect(() => {
    const latest = events[events.length - 1]
    if (latest) setStatus(latest.status as typeof status)
  }, [events])

  const reachedAt = new Map(events.map((e) => [e.status, e.created_at]))
  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.status === status)
  const cancelled = status === 'cancelled'
  const canCancel = ['pending', 'confirmed', 'vendor_assigned'].includes(status)

  async function doCancel() {
    setError(null)
    try {
      await cancelBooking(booking.id)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not cancel this booking.'))
    }
  }

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingBottom: 32, gap: 16 }}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={load} />}
      >
        <View className="gap-2">
          <Eyebrow className="text-primary">{booking.reference}</Eyebrow>
          <H1>{booking.items[0]?.service_name ?? 'Booking'}</H1>
          <View className="flex-row items-center gap-2">
            <Badge
              label={STATUS_LABEL[status] ?? status}
              tone={cancelled ? 'destructive' : status === 'completed' ? 'success' : 'default'}
            />
            <Muted className="text-[12px]">
              {formatDay(booking.scheduledDate)}
              {booking.scheduledSlot ? ` · ${booking.scheduledSlot}` : ''}
            </Muted>
          </View>
        </View>

        {error ? <Muted className="text-destructive">{error}</Muted> : null}

        {cancelled ? (
          <Card className="bg-secondary">
            <Text className="font-bold text-[14px] text-foreground">This booking was cancelled.</Text>
            <Muted className="mt-1 text-[12px]">Call us if that was not intended.</Muted>
          </Card>
        ) : booking.kind === 'deep' ? (
          <Card className="gap-0">
            <Eyebrow className="mb-3">Progress</Eyebrow>
            {TIMELINE_STEPS.map((step, i) => {
              const done = currentIndex >= i && currentIndex !== -1
              const at = reachedAt.get(step.status)
              const isLast = i === TIMELINE_STEPS.length - 1
              return (
                <View key={step.status} className="flex-row gap-3">
                  <View className="items-center">
                    <View
                      className={
                        done ? 'h-3.5 w-3.5 rounded-pill bg-primary' : 'h-3.5 w-3.5 rounded-pill bg-border'
                      }
                    />
                    {!isLast ? (
                      <View className={done ? 'w-0.5 flex-1 bg-primary/40' : 'w-0.5 flex-1 bg-border'} />
                    ) : null}
                  </View>
                  <View className={isLast ? 'flex-1 pb-0' : 'flex-1 pb-5'}>
                    <Text
                      className={
                        done ? 'font-bold text-[14px] text-foreground' : 'font-medium text-[14px] text-muted-foreground'
                      }
                    >
                      {step.label}
                    </Text>
                    <Muted className="text-[12px]">{at ? formatStamp(at) : step.blurb}</Muted>
                  </View>
                </View>
              )
            })}
          </Card>
        ) : (
          <Card>
            <Eyebrow>Prime Now</Eyebrow>
            <Muted className="mt-1.5 text-[13px]">
              We are dispatching a helper for this request. Our team calls to confirm the arrival time.
            </Muted>
          </Card>
        )}

        <Card className="gap-2.5">
          <Eyebrow>Booking</Eyebrow>
          {booking.items.map((i, n) => (
            <View key={n} className="flex-row items-baseline justify-between gap-3">
              <Muted className="flex-1">
                {i.service_name}
                {i.units > 1 ? ` · ${i.units}` : ''}
                {i.qty > 1 ? ` ×${i.qty}` : ''}
              </Muted>
              <Text className="font-medium text-[14px] text-foreground">{formatINR(i.line_total)}</Text>
            </View>
          ))}
          <Divider className="my-1" />
          <View className="flex-row items-baseline justify-between">
            <Text className="font-bold text-[15px] text-foreground">Total</Text>
            <Text className="font-black text-[18px] text-foreground">{formatINR(booking.total)}</Text>
          </View>
          <Muted className="text-[12px]">
            {booking.address}
            {booking.city ? `, ${booking.city}` : ''}
          </Muted>
        </Card>

        <Button
          label="Call us about this booking"
          variant="outline"
          onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)}
        />

        {status === 'completed' ? (
          <Button label="Rate your helper" onPress={() => navigation.navigate('RateTip', { booking })} />
        ) : null}

        {canCancel ? <Button label="Cancel booking" variant="ghost" onPress={doCancel} /> : null}
      </ScrollView>
    </Screen>
  )
}

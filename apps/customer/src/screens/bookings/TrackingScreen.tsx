import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, ScrollView, View } from 'react-native'

import { Badge, Button, Card, Divider, Eyebrow, H1, Muted, Refresher, Screen, Text } from '../../components/ui'
import { canCancel, cancelBooking, cancelPrimeNowRequest, fetchBookingEvents } from '../../lib/bookings'
import { formatDay, formatINR, formatINRPaise, formatStamp } from '../../lib/format'
import { TASK_LABEL, fetchDispatchState } from '../../lib/prime-now'
import { errorMessage, supabase } from '../../lib/supabase'
import {
  PRIME_TIMELINE_STEPS,
  STATUS_LABEL,
  TIMELINE_STEPS,
  type BookingEvent,
  type BookingStatus,
} from '../../lib/types'
import type { BookingsStackProps } from '../../navigation/types'

const SUPPORT_PHONE = '917349603429'

/**
 * Screen 21. Status timeline, booking detail, and the actions that apply.
 *
 * Deep Cleaning: the timeline is a projection of `booking_events` — written by
 * a trigger on every status change from any source — so it can never disagree
 * with the booking's real state the way client-side guessing would.
 *
 * Prime Now: there is no events table, so the four steps are derived from the
 * request's status, which is watched live.
 *
 * No helper card or live map yet: a customer has no RLS path to `vendors`, and
 * nothing reports helper GPS. Both need a booking-scoped RPC and partner-side
 * location before they would show anything true.
 */
export function TrackingScreen({ route, navigation }: BookingsStackProps<'Tracking'>) {
  const { booking } = route.params
  const isNow = booking.kind === 'now'
  const [events, setEvents] = useState<BookingEvent[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<BookingStatus>(booking.status)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      if (isNow) {
        const state = await fetchDispatchState(booking.id)
        if (state) setStatus(state.status as BookingStatus)
      } else {
        setEvents(await fetchBookingEvents(booking.id))
      }
      setError(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not load the latest status.'))
    } finally {
      setRefreshing(false)
    }
  }, [booking.id, isNow])

  useEffect(() => {
    load()
  }, [load])

  // Live updates: the customer sees a status change the moment ops or the
  // helper makes it, without pulling to refresh. Both tables are in the
  // realtime publication, and RLS scopes delivery to this customer's rows.
  useEffect(() => {
    const channel = supabase
      .channel(`booking:${booking.kind}:${booking.id}`)
      .on(
        'postgres_changes',
        isNow
          ? { event: 'UPDATE', schema: 'public', table: 'prime_now_requests', filter: `id=eq.${booking.id}` }
          : { event: '*', schema: 'public', table: 'booking_events', filter: `order_id=eq.${booking.id}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [booking.id, booking.kind, isNow, load])

  useEffect(() => {
    const latest = events[events.length - 1]
    if (latest) setStatus(latest.status as BookingStatus)
  }, [events])

  const steps = isNow ? PRIME_TIMELINE_STEPS : TIMELINE_STEPS
  const reachedAt = new Map(events.map((e) => [e.status, e.created_at]))
  if (isNow) reachedAt.set('new', booking.createdAt)
  const currentIndex = steps.findIndex((s) => s.status === status)
  const cancelled = status === 'cancelled'
  const cancellable = canCancel({ kind: booking.kind, status })
  const live = !cancelled && status !== 'completed'

  function confirmCancel() {
    Alert.alert(isNow ? 'Cancel this request?' : 'Cancel this booking?', 'This cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: isNow ? 'Cancel request' : 'Cancel booking', style: 'destructive', onPress: doCancel },
    ])
  }

  async function doCancel() {
    setCancelling(true)
    setError(null)
    try {
      if (isNow) await cancelPrimeNowRequest(booking.id)
      else await cancelBooking(booking.id)
      setStatus('cancelled')
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not cancel this booking.'))
    } finally {
      setCancelling(false)
    }
  }

  // GST is contained in the price, never added on top. The split is shown so
  // the bill here matches the invoice line for line; the SGST half takes the
  // rounding remainder so the two always add back to the tax exactly.
  const cgst = Math.round((booking.tax / 2) * 100) / 100
  const sgst = Math.round((booking.tax - cgst) * 100) / 100

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
            <Text className="font-bold text-[14px] text-foreground">
              {isNow ? 'This request was cancelled.' : 'This booking was cancelled.'}
            </Text>
            <Muted className="mt-1 text-[12px]">Call us if that was not intended.</Muted>
          </Card>
        ) : (
          <Card className="gap-0">
            <Eyebrow className="mb-3">Progress</Eyebrow>
            {steps.map((step, i) => {
              const done = currentIndex >= i && currentIndex !== -1
              const at = reachedAt.get(step.status)
              const isLast = i === steps.length - 1
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
                    <Muted className="text-[12px]">{done && at ? formatStamp(at) : step.blurb}</Muted>
                  </View>
                </View>
              )
            })}
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
          {isNow && booking.tasks && booking.tasks.length > 0 ? (
            <Muted className="text-[12px]">{booking.tasks.map((t) => TASK_LABEL[t] ?? t).join(' · ')}</Muted>
          ) : null}
          <Divider className="my-1" />
          {!isNow && booking.tax > 0 ? (
            <>
              <Row label="Taxable value" value={formatINRPaise(booking.subtotal)} />
              <Row label="CGST @ 9%" value={formatINRPaise(cgst)} />
              <Row label="SGST @ 9%" value={formatINRPaise(sgst)} />
            </>
          ) : null}
          <View className="flex-row items-baseline justify-between">
            <Text className="font-bold text-[15px] text-foreground">Total</Text>
            <Text className="font-black text-[18px] text-foreground">{formatINR(booking.total)}</Text>
          </View>
          <Muted className="text-[11px]">
            {isNow ? 'Flat price for the slot. No travel charge.' : 'Inclusive of 18% GST.'}
            {booking.paymentStatus === 'paid' ? ' Paid.' : ' Pay after the work is done, by cash or UPI.'}
          </Muted>
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

        {/* Only Deep Cleaning can be rated: submit_review is keyed to an
            order line, and a Prime Now request has no order. */}
        {status === 'completed' && !isNow ? (
          <Button label="Rate your helper" onPress={() => navigation.navigate('RateTip', { booking })} />
        ) : null}

        {cancellable ? (
          <Button
            label={isNow ? 'Cancel request' : 'Cancel booking'}
            variant="ghost"
            onPress={confirmCancel}
            loading={cancelling}
          />
        ) : live ? (
          <Muted className="text-center text-[12px]">
            {isNow
              ? 'Your helper has already started. Call us to change this request.'
              : 'A helper is already on this booking. Call us to change or cancel it.'}
          </Muted>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Muted className="text-[13px]">{label}</Muted>
      <Text className="font-medium text-[13px] text-foreground">{value}</Text>
    </View>
  )
}

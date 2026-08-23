import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native'

import { Badge, Button, Card, Divider, Eyebrow, H1, Muted, Refresher, Screen, Text } from '../../components/ui'
import { track } from '../../lib/analytics'
import {
  canCancel,
  canReschedule,
  cancelBooking,
  cancelPrimeNowRequest,
  fetchBookingEvents,
  fetchBookingHelper,
  fetchPaymentState,
  rebookLines,
  rescheduleBooking,
} from '../../lib/bookings'
import { useCart } from '../../lib/cart'
import { dateKey, dateParts, formatDay, formatINR, formatINRPaise, formatStamp, upcomingDays } from '../../lib/format'
import { ONLINE_PAYMENTS_ENABLED, startOnlinePayment } from '../../lib/payments'
import { TASK_LABEL, fetchDispatchState } from '../../lib/prime-now'
import { errorMessage, supabase } from '../../lib/supabase'
import {
  ANY_TIME_WINDOW,
  PRIME_TIMELINE_STEPS,
  STATUS_LABEL,
  TIMELINE_STEPS,
  TIME_WINDOWS,
  type BookingEvent,
  type BookingStatus,
  type Helper,
} from '../../lib/types'
import type { BookingsStackProps } from '../../navigation/types'

const SUPPORT_PHONE = '917349603429'
const HELPER_VISIBLE: BookingStatus[] = ['vendor_assigned', 'dispatched', 'en_route', 'in_progress', 'completed']

/**
 * Screen 21. Status timeline, who is coming, the booking, and the actions that
 * apply to its current state.
 *
 * Deep Cleaning: the timeline is a projection of `booking_events` — written by
 * a trigger on every status change from any source — so it can never disagree
 * with the booking's real state. A reschedule also lands there (0029), as a
 * note rather than a step.
 *
 * Prime Now: there is no events table, so the four steps are derived from the
 * request's status, which is watched live.
 *
 * The helper card comes from my_booking_helper(): name and rating once a
 * partner is assigned, their phone only while the job is live. No map and no
 * ETA — nothing reports helper GPS yet.
 */
export function TrackingScreen({ route, navigation }: BookingsStackProps<'Tracking'>) {
  const { booking } = route.params
  const isNow = booking.kind === 'now'
  const { addLines } = useCart()
  const [events, setEvents] = useState<BookingEvent[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<BookingStatus>(booking.status)
  const [scheduled, setScheduled] = useState({ date: booking.scheduledDate, slot: booking.scheduledSlot })
  const [helper, setHelper] = useState<Helper | null>(null)
  const [payment, setPayment] = useState({
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod,
    paidAt: booking.paidAt,
  })
  const [cancelling, setCancelling] = useState(false)
  const [rebooking, setRebooking] = useState(false)
  const [paying, setPaying] = useState(false)

  // Reschedule panel
  const days = useMemo(() => upcomingDays(14), [])
  const [editing, setEditing] = useState(false)
  const [newDay, setNewDay] = useState<Date>(days[0])
  const [newWindow, setNewWindow] = useState<string | 'keep'>('keep')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      if (isNow) {
        const state = await fetchDispatchState(booking.id)
        // "On the way" is a timestamp on the request, not a status of its own.
        if (state) setStatus(state.status === 'dispatched' && state.enRouteAt ? 'en_route' : (state.status as BookingStatus))
      } else {
        setEvents(await fetchBookingEvents(booking.id))
      }
      // Paid state can change underneath the list's snapshot (cash checkbox,
      // CRM, webhook); never block the timeline on it.
      fetchPaymentState(booking.kind, booking.id)
        .then((p) => p && setPayment(p))
        .catch(() => {})
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

  // Who is coming — only meaningful once someone has been assigned.
  useEffect(() => {
    if (!HELPER_VISIBLE.includes(status)) {
      setHelper(null)
      return
    }
    fetchBookingHelper(booking.kind, booking.id)
      .then(setHelper)
      .catch(() => {})
  }, [booking.id, booking.kind, status])

  const steps = isNow ? PRIME_TIMELINE_STEPS : TIMELINE_STEPS
  // First time each status was reached; a reschedule re-records the current
  // status with a note and must not move the step's timestamp.
  const reachedAt = new Map<string, string>()
  for (const e of events) if (!reachedAt.has(e.status)) reachedAt.set(e.status, e.created_at)
  if (isNow) reachedAt.set('new', booking.createdAt)
  const lastReschedule = [...events].reverse().find((e) => e.note?.startsWith('Rescheduled'))
  const currentIndex = steps.findIndex((s) => s.status === status)
  const cancelled = status === 'cancelled'
  const cancellable = canCancel({ kind: booking.kind, status })
  const reschedulable = canReschedule({ kind: booking.kind, status })
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
      track('cancel_booking', { kind: booking.kind, status })
      setStatus('cancelled')
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not cancel this booking.'))
    } finally {
      setCancelling(false)
    }
  }

  async function saveReschedule() {
    setSaving(true)
    setError(null)
    try {
      const slot = newWindow === 'keep' ? null : newWindow === ANY_TIME_WINDOW ? null : newWindow
      await rescheduleBooking(booking.id, dateKey(newDay), slot)
      track('reschedule_booking', { reference: booking.reference })
      setScheduled({ date: dateKey(newDay), slot: newWindow === 'keep' ? scheduled.slot : slot })
      setEditing(false)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not change the date.'))
    } finally {
      setSaving(false)
    }
  }

  async function payNow() {
    setPaying(true)
    setError(null)
    try {
      const outcome = await startOnlinePayment(booking.kind, booking.id)
      if (outcome === 'success') {
        track('payment_success', { reference: booking.reference })
        // The webhook marks it paid a moment after the browser returns.
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 1500))
          const p = await fetchPaymentState(booking.kind, booking.id).catch(() => null)
          if (p) setPayment(p)
          if (p?.paymentStatus === 'paid') break
        }
      } else if (outcome === 'failed') {
        setError('The payment did not go through. Nothing was charged.')
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not start the payment.'))
    } finally {
      setPaying(false)
    }
  }

  async function rebook() {
    setRebooking(true)
    setError(null)
    try {
      const { lines } = await rebookLines(booking)
      if (lines.length === 0) {
        setError('These services are no longer offered. Browse the catalogue for what replaced them.')
        return
      }
      addLines(lines)
      navigation.getParent()?.navigate({ name: 'HomeTab', params: { screen: 'Cart' } } as never)
    } catch (err) {
      setError(errorMessage(err, 'Could not rebuild that booking.'))
    } finally {
      setRebooking(false)
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
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge
              label={STATUS_LABEL[status] ?? status}
              tone={cancelled ? 'destructive' : status === 'completed' ? 'success' : 'default'}
            />
            <Muted className="text-[12px]">
              {formatDay(scheduled.date)}
              {scheduled.slot ? ` · ${scheduled.slot}` : ''}
            </Muted>
          </View>
          {lastReschedule ? (
            <Muted className="text-[12px]">
              {lastReschedule.note} · {formatStamp(lastReschedule.created_at)}
            </Muted>
          ) : null}
        </View>

        {error ? <Muted className="text-destructive">{error}</Muted> : null}

        {reschedulable && !editing ? (
          <Pressable accessibilityRole="button" onPress={() => setEditing(true)} className="min-h-[44px] justify-center">
            <Text className="font-bold text-[14px] text-primary">Change the date or window ›</Text>
          </Pressable>
        ) : null}

        {editing ? (
          <Card className="gap-4">
            <Eyebrow>New date</Eyebrow>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {days.map((d) => {
                const p = dateParts(d)
                const active = newDay.toDateString() === d.toDateString()
                return (
                  <Pressable
                    key={d.toISOString()}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setNewDay(new Date(d))}
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

            <View className="gap-2">
              <Eyebrow>Arrival window</Eyebrow>
              {(['keep', ...TIME_WINDOWS, ANY_TIME_WINDOW] as const).map((w) => {
                const active = newWindow === w
                return (
                  <Pressable
                    key={w}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setNewWindow(w)}
                    className={
                      active
                        ? 'min-h-[48px] justify-center rounded-md border-2 border-primary bg-secondary px-4'
                        : 'min-h-[48px] justify-center rounded-md border border-border bg-card px-4'
                    }
                  >
                    <Text className="font-medium text-[14px] text-foreground">
                      {w === 'keep' ? `Keep current${scheduled.slot ? ` (${scheduled.slot})` : ''}` : w}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <View className="flex-row gap-2">
              <Button label="Save" onPress={saveReschedule} loading={saving} className="flex-1" />
              <Button label="Discard" variant="outline" onPress={() => setEditing(false)} className="flex-1" />
            </View>
          </Card>
        ) : null}

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

        {helper ? (
          <Card className="gap-3">
            <Eyebrow>Your helper</Eyebrow>
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-pill bg-secondary">
                <Text className="font-black text-[18px] text-primary">{helper.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-[15px] text-foreground">{helper.name}</Text>
                <Muted className="text-[12px]">
                  {helper.rating !== null && helper.ratingCount > 0
                    ? `★ ${helper.rating.toFixed(1)} · ${helper.ratingCount} ${helper.ratingCount === 1 ? 'review' : 'reviews'}`
                    : 'Verified helper'}
                </Muted>
              </View>
            </View>
            {helper.phone ? (
              <Button
                label="Call helper"
                variant="outline"
                onPress={() => Linking.openURL(`tel:+91${helper.phone!.replace(/\D/g, '').slice(-10)}`)}
              />
            ) : null}
          </Card>
        ) : null}

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
            {payment.paymentStatus === 'paid'
              ? ` Paid${payment.paymentMethod ? ` by ${payment.paymentMethod}` : ''}${payment.paidAt ? ` on ${formatStamp(payment.paidAt)}` : ''}.`
              : payment.paymentStatus === 'refunded'
                ? ' Refunded.'
                : ' Pay after the work is done, by cash or UPI.'}
          </Muted>
          <Muted className="text-[12px]">
            {booking.address}
            {booking.city ? `, ${booking.city}` : ''}
          </Muted>
          {booking.notes ? <Muted className="text-[12px]">Notes: {booking.notes}</Muted> : null}
        </Card>

        <Button
          label="Call us about this booking"
          variant="outline"
          onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)}
        />

        {ONLINE_PAYMENTS_ENABLED && payment.paymentStatus === 'unpaid' && !cancelled ? (
          <Button label="Pay now by UPI or card" variant="brand" onPress={payNow} loading={paying} />
        ) : null}

        {status === 'completed' || payment.paymentStatus === 'paid' ? (
          <Button
            label="View receipt"
            variant="outline"
            onPress={() => navigation.navigate('Receipt', { booking: { ...booking, ...payment } })}
          />
        ) : null}

        {status === 'completed' ? (
          <Button label="Rate your helper" onPress={() => navigation.navigate('RateTip', { booking })} />
        ) : null}

        {!isNow && (status === 'completed' || cancelled) ? (
          <Button label="Book again" variant="dark" onPress={rebook} loading={rebooking} />
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

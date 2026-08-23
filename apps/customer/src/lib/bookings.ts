import { supabase } from './supabase'
import type {
  Address,
  Booking,
  BookingEvent,
  BookingStatus,
  CartLine,
  NotificationPrefs,
  Profile,
} from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Applied once per booking. Zero until the business decides (open decision in
 * the product spec): create_booking() charges nothing beyond the catalogue
 * price, so showing ₹50 here was a line the bill never contained. When it is
 * agreed, add it server-side first and set it here second.
 */
export const VISIT_CHARGE = 0

/* ── Profile & addresses ──────────────────────────────────────────────────── */

/** The customer row for the signed-in user, if create_booking has made one yet. */
export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('id,name,phone,email,city')
    .maybeSingle()
  if (error) throw error
  return (data as Profile | null) ?? null
}

export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('id,label,full_address,city,is_default')
    .order('is_default', { ascending: false })
  if (error) throw error
  return ((data as Address[] | null) ?? [])
}

export async function fetchNotificationPrefs(): Promise<NotificationPrefs | null> {
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('booking_updates,helper_en_route,marketing')
    .maybeSingle()
  if (error) throw error
  return (data as NotificationPrefs | null) ?? null
}

export async function saveNotificationPrefs(p: Partial<NotificationPrefs> & { token?: string }) {
  const { error } = await supabase.rpc('save_notification_prefs', {
    p_booking_updates: p.booking_updates ?? null,
    p_helper_en_route: p.helper_en_route ?? null,
    p_marketing: p.marketing ?? null,
    p_expo_push_token: p.token ?? null,
  })
  if (error) throw error
}

/* ── Creating a booking ───────────────────────────────────────────────────── */

export interface CheckoutInput {
  name: string
  phone: string
  email: string
  city: string
  address: string
  date: string
  slot: string | null
  notes: string | null
  lines: CartLine[]
}

/**
 * Deep Cleaning checkout.
 *
 * create_booking re-prices every line from the live catalogue server-side, so
 * the totals shown in the cart are an estimate until it returns — a tampered
 * client cannot buy a ₹5,999 villa clean for ₹1.
 */
export async function createBooking(input: CheckoutInput): Promise<{ order_number: string }> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email,
    p_city: input.city,
    p_address: input.address,
    p_scheduled_date: input.date,
    p_slot: input.slot ?? undefined,
    p_notes: input.notes ?? undefined,
    p_items: input.lines.map((l) => ({
      service_id: l.serviceId,
      qty: l.qty,
      units: l.units,
    })),
  })
  if (error) throw error
  return data as unknown as { order_number: string }
}

/* ── Reading bookings ─────────────────────────────────────────────────────── */

/** Deep Cleaning and Prime Now use different vocabularies for "still live". */
const OPEN_DEEP: BookingStatus[] = ['pending', 'confirmed', 'vendor_assigned', 'in_progress']
const OPEN_NOW: BookingStatus[] = ['new', 'dispatched', 'in_progress']

export const isUpcoming = (b: Booking) => (b.kind === 'now' ? OPEN_NOW : OPEN_DEEP).includes(b.status)

/**
 * Whether the customer may still cancel from the app. Mirrors the server
 * rules exactly — cancel_booking() accepts pending/confirmed only, and
 * cancel_prime_now_request() accepts new/dispatched — so the button is never
 * shown for a booking the RPC would refuse.
 */
export const canCancel = (b: Pick<Booking, 'kind' | 'status'>) =>
  b.kind === 'now'
    ? ['new', 'dispatched'].includes(b.status)
    : ['pending', 'confirmed'].includes(b.status)

/**
 * Everything the customer has booked, across both domains, newest first.
 * Deep Cleaning lives in `orders`; Prime Now in `prime_now_requests`. The list
 * merges them so "My bookings" is one list, as the spec asks.
 */
export async function fetchBookings(): Promise<Booking[]> {
  const [orders, prime] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id,order_number,status,scheduled_date,scheduled_slot,city,address,notes,subtotal,tax,total,payment_status,created_at,order_items(service_name,qty,units,unit_price,line_total)',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('prime_now_requests')
      .select(
        'id,request_number,status,scheduled_for,timing,city,address,notes,price,payment_status,slot_minutes,tasks,created_at',
      )
      .order('created_at', { ascending: false }),
  ])
  if (orders.error) throw orders.error
  if (prime.error) throw prime.error

  const deep: Booking[] = ((orders.data as any[]) ?? []).map((o) => ({
    id: o.id,
    reference: o.order_number,
    status: o.status,
    scheduledDate: o.scheduled_date,
    scheduledSlot: o.scheduled_slot,
    city: o.city,
    address: o.address,
    notes: o.notes,
    subtotal: Number(o.subtotal ?? 0),
    tax: Number(o.tax ?? 0),
    total: Number(o.total ?? 0),
    paymentStatus: o.payment_status ?? 'unpaid',
    items: ((o.order_items as any[]) ?? []).map((i) => ({
      service_name: i.service_name,
      qty: Number(i.qty ?? 1),
      units: Number(i.units ?? 1),
      unit_price: Number(i.unit_price ?? 0),
      line_total: Number(i.line_total ?? 0),
    })),
    createdAt: o.created_at,
    kind: 'deep' as const,
  }))

  const now: Booking[] = ((prime.data as any[]) ?? []).map((r) => ({
    id: r.id,
    reference: r.request_number,
    status: r.status,
    scheduledDate: r.timing === 'scheduled' && r.scheduled_for ? String(r.scheduled_for).slice(0, 10) : null,
    scheduledSlot: r.timing === 'now' ? 'Within the hour' : null,
    city: r.city,
    address: r.address,
    notes: r.notes,
    subtotal: Number(r.price ?? 0),
    tax: 0,
    total: Number(r.price ?? 0),
    paymentStatus: r.payment_status ?? 'unpaid',
    items: [
      {
        service_name: `Prime Now · ${r.slot_minutes} min help`,
        qty: 1,
        units: 1,
        unit_price: Number(r.price ?? 0),
        line_total: Number(r.price ?? 0),
      },
    ],
    createdAt: r.created_at,
    kind: 'now' as const,
    tasks: r.tasks ?? [],
  }))

  return [...deep, ...now].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** The tracking timeline — a projection of booking_events, never client state. */
export async function fetchBookingEvents(orderId: string): Promise<BookingEvent[]> {
  const { data, error } = await supabase
    .from('booking_events')
    .select('id,status,note,created_at')
    .eq('order_id', orderId)
    .order('created_at')
  if (error) throw error
  return ((data as BookingEvent[] | null) ?? [])
}

export async function cancelBooking(orderId: string) {
  const { error } = await supabase.rpc('cancel_booking', { p_order_id: orderId })
  if (error) throw error
}

/** Cancel a Prime Now request. Open partner offers are superseded server-side. */
export async function cancelPrimeNowRequest(requestId: string) {
  const { error } = await supabase.rpc('cancel_prime_now_request', { p_request_id: requestId })
  if (error) throw error
}

export async function rescheduleBooking(orderId: string, date: string, slot: string | null) {
  const { error } = await supabase.rpc('reschedule_booking', {
    p_order_id: orderId,
    p_date: date,
    p_slot: slot ?? undefined,
  })
  if (error) throw error
}

/* ── Rating ───────────────────────────────────────────────────────────────── */

export async function submitRating(input: {
  orderId: string
  serviceId: string
  stars: number
  comment: string | null
  tip: number
}) {
  const { error } = await supabase.rpc('submit_review', {
    p_order_id: input.orderId,
    p_service_id: input.serviceId,
    p_rating: input.stars,
    p_comment: input.comment ?? undefined,
    p_tip_amount: input.tip,
  })
  if (error) throw error
}

/* ── Profile & address setup ──────────────────────────────────────────────── */

/**
 * Create or update the caller's customers row.
 *
 * A customers row previously only appeared on the first booking, which left
 * current_customer_id() NULL during setup and made an address insert fail RLS.
 * This RPC is SECURITY DEFINER because `customers` deliberately has no INSERT
 * policy — clients must not be able to invent rows.
 */
export async function upsertMyProfile(input: {
  name: string
  email?: string | null
  phone?: string | null
  city?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_my_profile', {
    p_name: input.name,
    p_email: input.email ?? undefined,
    p_phone: input.phone ?? undefined,
    p_city: input.city ?? undefined,
  })
  if (error) throw error
  return data as unknown as string
}

/** Save an address, creating the profile row first if setup has not yet. */
export async function saveMyAddress(input: {
  label: string
  fullAddress: string
  city: string
  isDefault?: boolean
  name?: string | null
  phone?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('save_my_address', {
    p_label: input.label,
    p_full_address: input.fullAddress,
    p_city: input.city,
    p_is_default: input.isDefault ?? true,
    p_name: input.name ?? undefined,
    p_phone: input.phone ?? undefined,
  })
  if (error) throw error
  return data as unknown as string
}

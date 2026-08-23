// notify-customer — one push to the customer's phone per booking event.
//
// Called by the database (pg_net, migration 0030) on every booking_events
// insert and every Prime Now status / on-the-way change. Not a JWT endpoint:
// the caller is Postgres, which proves itself with the shared secret held in
// Vault; this function fetches the same secret through notify_secret() with
// the service role and compares. Anything else gets 403.
//
// What is sent is decided here, never in SQL: the customer's preferences gate
// it, and the copy lives in one place (docs/customer-app-master-prompt.md §6).
//
// Deployed with the Supabase MCP `deploy_edge_function` (verify_jwt: false —
// the secret check above is the authentication). Redeploy after editing.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type Payload = { kind: 'deep' | 'now'; id: string; event: string; note?: string | null }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDay(key: string | null) {
  if (!key) return 'a date to be confirmed'
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]}`
}
function firstName(name: string | null | undefined) {
  return (name ?? '').trim().split(' ')[0] || 'Your helper'
}
function rupees(n: number) {
  const whole = Math.round(n)
  const s = String(Math.abs(whole))
  if (s.length <= 3) return `₹${s}`
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `₹${rest},${last3}`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const presented = req.headers.get('x-notify-secret') ?? ''
  const { data: secret, error: secretErr } = await admin.rpc('notify_secret')
  if (secretErr || !secret || presented !== secret) return json({ error: 'Forbidden' }, 403)

  let payload: Payload
  try {
    payload = (await req.json()) as Payload
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }
  const { kind, id, event } = payload
  const note = payload.note ?? null
  if ((kind !== 'deep' && kind !== 'now') || !id || !event) return json({ error: 'Bad payload' }, 400)

  // Nothing to say for these: the customer just did it themselves, or it is
  // the migration backfill.
  if (event === 'pending' || event === 'new' || note === 'Recorded at migration' || note === 'Booking created') {
    return json({ sent: false, reason: 'silent-event' })
  }

  // ── Load the booking, the customer and their preferences ─────────────────
  let customerId: string | null = null
  let reference = ''
  let service = ''
  let when = ''
  let total = 0
  let vendorId: string | null = null

  if (kind === 'deep') {
    const { data: o } = await admin
      .from('orders')
      .select('order_number, customer_id, scheduled_date, scheduled_slot, total, assigned_vendor_id, order_items(service_name)')
      .eq('id', id)
      .maybeSingle()
    if (!o) return json({ sent: false, reason: 'no-order' })
    customerId = o.customer_id
    reference = o.order_number
    service = ((o.order_items as { service_name: string }[] | null) ?? []).map((i) => i.service_name).join(', ') || 'Your booking'
    when = `${formatDay(o.scheduled_date)}${o.scheduled_slot ? ` · ${o.scheduled_slot}` : ''}`
    total = Number(o.total ?? 0)
    vendorId = o.assigned_vendor_id
  } else {
    const { data: r } = await admin
      .from('prime_now_requests')
      .select('request_number, customer_id, slot_minutes, price, assigned_vendor_id')
      .eq('id', id)
      .maybeSingle()
    if (!r) return json({ sent: false, reason: 'no-request' })
    customerId = r.customer_id
    reference = r.request_number
    service = `Prime Now · ${r.slot_minutes} min help`
    total = Number(r.price ?? 0)
    vendorId = r.assigned_vendor_id
  }
  if (!customerId) return json({ sent: false, reason: 'no-customer' })

  const { data: prefs } = await admin
    .from('notification_prefs')
    .select('booking_updates, helper_en_route, expo_push_token')
    .eq('customer_id', customerId)
    .maybeSingle()
  if (!prefs?.expo_push_token) return json({ sent: false, reason: 'no-token' })

  const gate = event === 'en_route' ? prefs.helper_en_route : prefs.booking_updates
  if (!gate) return json({ sent: false, reason: 'opted-out' })

  let helper = 'Your helper'
  if (vendorId) {
    const { data: v } = await admin.from('vendors').select('name').eq('id', vendorId).maybeSingle()
    helper = firstName(v?.name)
  }

  // ── Copy (§6 of the spec) ────────────────────────────────────────────────
  let title: string | null = null
  let body = ''
  const isReschedule = typeof note === 'string' && note.startsWith('Rescheduled')
  const isPaid = typeof note === 'string' && note.startsWith('Paid')

  if (isReschedule) {
    title = 'Date changed'
    body = `${reference} is now on ${when}.`
  } else if (isPaid) {
    title = 'Payment received'
    body = `${rupees(total)} for ${reference}. Receipt in the app.`
  } else if (kind === 'deep') {
    switch (event) {
      case 'confirmed':
        title = 'Booking confirmed'
        body = `${service} on ${when}.`
        break
      case 'vendor_assigned':
        title = 'Helper assigned'
        body = `${helper} will come on ${when}. Tap to see details.`
        break
      case 'en_route':
        title = 'Your helper is on the way'
        body = `${helper} has set out for your address.`
        break
      case 'in_progress':
        title = 'Work has started'
        body = `Your ${service} is under way.`
        break
      case 'completed':
        title = 'All done'
        body = 'How did it go? Rate your helper and leave a tip.'
        break
      case 'cancelled':
        title = 'Booking cancelled'
        body = `${reference} was cancelled. Call us if that was not expected.`
        break
    }
  } else {
    switch (event) {
      case 'dispatched':
        title = 'Helper found'
        body = `${helper} accepted your request and is on the way.`
        break
      case 'en_route':
        title = 'Your helper is on the way'
        body = `${helper} has set out for your address.`
        break
      case 'in_progress':
        title = 'Work has started'
        body = 'Your helper is on the job.'
        break
      case 'completed':
        title = 'All done'
        body = `Your Prime Now request ${reference} is complete. Thank you.`
        break
      case 'cancelled':
        title = 'Request cancelled'
        body = `${reference} was cancelled. Call us if that was not expected.`
        break
    }
  }
  if (!title) return json({ sent: false, reason: 'no-copy-for-event' })

  // ── Send ─────────────────────────────────────────────────────────────────
  const res = await fetch(EXPO_PUSH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: prefs.expo_push_token,
      title,
      body,
      data: { kind, id, event },
      sound: 'default',
      channelId: 'bookings',
      priority: 'high',
    }),
  })
  const result = (await res.json().catch(() => ({}))) as { data?: { status?: string; details?: { error?: string } } }
  const details = result.data?.details
  if (details?.error === 'DeviceNotRegistered') {
    await admin.from('notification_prefs').update({ expo_push_token: null }).eq('customer_id', customerId)
    return json({ sent: false, reason: 'device-not-registered' })
  }
  return json({ sent: res.ok && result.data?.status !== 'error', status: result.data?.status ?? null })
})

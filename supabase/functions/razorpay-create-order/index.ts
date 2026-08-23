// razorpay-create-order — start an online payment for one of the caller's
// own bookings.
//
// Called with the customer's JWT (verify_jwt: true). The booking is read as
// the user, so RLS proves ownership; the amount comes from the row, never the
// client. Creates the Razorpay order, records a `payments` row in state
// 'created', and returns what Checkout needs. The webhook finishes the story.
//
// Until RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set as function secrets
// (`supabase secrets set …` or the dashboard) this answers 503, and the app
// keeps "pay after the work" as the only option — the switch on the app side
// is ONLINE_PAYMENTS_ENABLED in src/lib/payments.ts.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const keyId = Deno.env.get('RAZORPAY_KEY_ID')
const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!keyId || !keySecret) return json({ error: 'Online payment is not set up yet' }, 503)

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Sign in first' }, 401)

  let body: { kind?: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }
  const kind = body.kind === 'now' ? 'now' : body.kind === 'deep' ? 'deep' : null
  if (!kind || !body.id) return json({ error: 'Bad payload' }, 400)

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Read as the user: RLS only returns the caller's own row.
  let reference = ''
  let amount = 0
  let customerId: string | null = null
  let description = ''
  if (kind === 'deep') {
    const { data: o, error } = await asUser
      .from('orders')
      .select('id, order_number, total, payment_status, customer_id, order_items(service_name)')
      .eq('id', body.id)
      .maybeSingle()
    if (error || !o) return json({ error: 'Booking not found' }, 404)
    if (o.payment_status === 'paid') return json({ error: 'This booking is already paid' }, 409)
    reference = o.order_number
    amount = Number(o.total)
    customerId = o.customer_id
    description = ((o.order_items as { service_name: string }[] | null) ?? []).map((i) => i.service_name).join(', ')
  } else {
    const { data: r, error } = await asUser
      .from('prime_now_requests')
      .select('id, request_number, price, payment_status, customer_id, slot_minutes')
      .eq('id', body.id)
      .maybeSingle()
    if (error || !r) return json({ error: 'Request not found' }, 404)
    if (r.payment_status === 'paid') return json({ error: 'This request is already paid' }, 409)
    reference = r.request_number
    amount = Number(r.price)
    customerId = r.customer_id
    description = `Prime Now · ${r.slot_minutes} min help`
  }
  if (!(amount > 0)) return json({ error: 'Nothing to pay' }, 400)

  const paise = Math.round(amount * 100)
  const auth = 'Basic ' + btoa(`${keyId}:${keySecret}`)
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: paise,
      currency: 'INR',
      receipt: reference.slice(0, 40),
      notes: { kind, id: body.id, reference },
    }),
  })
  const order = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } }
  if (!res.ok || !order.id) {
    return json({ error: order.error?.description ?? 'Could not start the payment. Please try again.' }, 502)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: ledgerErr } = await admin.from('payments').insert({
    kind: kind === 'deep' ? 'deep_clean' : 'prime_now',
    job_id: body.id,
    customer_id: customerId,
    provider: 'razorpay',
    purpose: 'booking',
    provider_order_id: order.id,
    amount,
    currency: 'INR',
    status: 'created',
    raw: { order },
  })
  if (ledgerErr) return json({ error: ledgerErr.message }, 500)

  const { data: who } = await asUser.auth.getUser()
  const { data: cust } = await asUser.from('customers').select('name, phone, email').maybeSingle()

  return json({
    order_id: order.id,
    amount: paise,
    currency: 'INR',
    key_id: keyId,
    reference,
    name: 'MyPrimeCompany',
    description: description || reference,
    prefill: {
      name: cust?.name ?? '',
      contact: cust?.phone && !String(cust.phone).startsWith('pending:') ? cust.phone : '',
      email: cust?.email ?? who?.user?.email ?? '',
    },
  })
})

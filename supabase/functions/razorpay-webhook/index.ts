// razorpay-webhook — the source of truth for online payments.
//
// Razorpay calls this (no JWT; verify_jwt: false) and signs the raw body with
// the webhook secret. Only a valid signature gets past the first line.
//
//   payment.captured → payments row captured, booking payment_status = 'paid'
//                      (the 0031 trigger stamps paid_at), and for orders a
//                      booking_events note 'Paid online' so the customer's
//                      phone hears about it through notify-customer.
//   payment.failed   → payments row failed.
//   refund.processed → payments row refunded, booking payment_status = 'refunded'.
//
// Needs RAZORPAY_WEBHOOK_SECRET as a function secret; until then every call
// is refused, which is the safe direction.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function hmacHex(secret: string, data: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

type PaymentEntity = { id: string; order_id?: string; method?: string; amount?: number; status?: string }
type RefundEntity = { id: string; payment_id: string; amount?: number; status?: string }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!webhookSecret) return json({ error: 'Webhook secret not configured' }, 503)

  const raw = await req.text()
  const presented = req.headers.get('x-razorpay-signature') ?? ''
  const expected = await hmacHex(webhookSecret, raw)
  if (!presented || !timingSafeEqual(presented, expected)) return json({ error: 'Bad signature' }, 400)

  let event: { event?: string; payload?: { payment?: { entity?: PaymentEntity }; refund?: { entity?: RefundEntity } } }
  try {
    event = JSON.parse(raw)
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  if (event.event === 'payment.captured' || event.event === 'payment.failed') {
    const p = event.payload?.payment?.entity
    if (!p?.order_id) return json({ ok: true, ignored: 'no order id' })

    const { data: row } = await admin
      .from('payments')
      .select('id, kind, job_id, status')
      .eq('provider_order_id', p.order_id)
      .maybeSingle()
    if (!row) return json({ ok: true, ignored: 'unknown order' })
    if (row.status === 'captured' && event.event === 'payment.captured') return json({ ok: true, ignored: 'already captured' })

    const captured = event.event === 'payment.captured'
    await admin
      .from('payments')
      .update({
        status: captured ? 'captured' : 'failed',
        provider_payment_id: p.id,
        method: p.method ?? null,
        raw: event,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (captured) {
      const table = row.kind === 'deep_clean' ? 'orders' : 'prime_now_requests'
      await admin.from(table).update({ payment_status: 'paid', payment_method: 'razorpay' }).eq('id', row.job_id)
      if (table === 'orders') {
        const { data: o } = await admin.from('orders').select('status').eq('id', row.job_id).maybeSingle()
        if (o) await admin.from('booking_events').insert({ order_id: row.job_id, status: o.status, note: 'Paid online' })
      }
    }
    return json({ ok: true })
  }

  if (event.event === 'refund.processed') {
    const r = event.payload?.refund?.entity
    if (!r?.payment_id) return json({ ok: true, ignored: 'no payment id' })
    const { data: row } = await admin
      .from('payments')
      .select('id, kind, job_id')
      .eq('provider_payment_id', r.payment_id)
      .maybeSingle()
    if (!row) return json({ ok: true, ignored: 'unknown payment' })

    await admin
      .from('payments')
      .update({ status: 'refunded', raw: event, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    const table = row.kind === 'deep_clean' ? 'orders' : 'prime_now_requests'
    await admin.from(table).update({ payment_status: 'refunded' }).eq('id', row.job_id)
    return json({ ok: true })
  }

  return json({ ok: true, ignored: event.event ?? 'unknown event' })
})

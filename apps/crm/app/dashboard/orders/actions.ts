'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { notifyVendorOfAssignment } from '@/lib/push'
import { gstInclusive, type OrderStatus, type PaymentStatus } from '@prime/shared'

export interface ManualOrderInput {
  customer: { name: string; phone: string; email: string; city: string }
  address: string
  scheduled_date: string | null
  notes: string | null
  items: { service_id: string; qty: number }[]
}

type Result = { error: string } | { ok: true }

export async function createManualOrder(input: ManualOrderInput): Promise<Result> {
  const supabase = await createClient()
  const { customer, address, scheduled_date, notes, items } = input

  if (!customer.name.trim() || !customer.phone.trim()) return { error: 'Customer name and phone are required' }
  if (!customer.city.trim()) return { error: 'City is required' }
  if (!address.trim()) return { error: 'Address is required' }
  if (!items.length) return { error: 'Add at least one service' }

  // Upsert customer by phone
  let customerId: string
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', customer.phone.trim())
    .maybeSingle()

  if (existing) {
    customerId = existing.id
    await supabase
      .from('customers')
      .update({ name: customer.name.trim(), email: customer.email || null, city: customer.city })
      .eq('id', existing.id)
  } else {
    const { data: created, error } = await supabase
      .from('customers')
      .insert({ name: customer.name.trim(), phone: customer.phone.trim(), email: customer.email || null, city: customer.city })
      .select('id')
      .single()
    if (error || !created) return { error: error?.message ?? 'Could not create customer' }
    customerId = created.id
  }

  // Re-price every line from the live services table (never trust the client)
  const ids = items.map((i) => i.service_id)
  const { data: svc, error: svcErr } = await supabase.from('services').select('id,name,price').in('id', ids)
  if (svcErr) return { error: svcErr.message }
  const map = new Map((svc ?? []).map((s) => [s.id, s]))

  let gross = 0
  const lines = []
  for (const it of items) {
    const s = map.get(it.service_id)
    if (!s) continue
    // Server-side guard, not just the input's max: a mistyped 110 here once
    // produced a ₹659,890 order that was marked paid and skewed revenue.
    const qty = Math.max(Math.trunc(it.qty) || 1, 1)
    if (qty > 20) {
      return { error: `Quantity ${qty} for ${s.name} looks like a typo — 20 is the maximum per line.` }
    }
    const lineTotal = Number(s.price) * qty
    gross += lineTotal
    lines.push({ service_id: s.id, service_name: s.name, unit_price: Number(s.price), qty, line_total: lineTotal })
  }
  if (!lines.length) return { error: 'None of the selected services are valid' }

  // Prices include 18% GST — store the derived taxable value + tax (see tax.ts).
  const { total, taxable, tax } = gstInclusive(gross)

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'confirmed',
      scheduled_date: scheduled_date || null,
      city: customer.city,
      address: address.trim(),
      subtotal: taxable,
      tax,
      total,
      source: 'crm',
      notes: notes || null,
    })
    .select('id')
    .single()
  if (orderErr || !order) return { error: orderErr?.message ?? 'Could not create order' }

  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(lines.map((l) => ({ ...l, order_id: order.id })))
  if (itemsErr) return { error: itemsErr.message }

  revalidatePath('/dashboard/orders')
  redirect(`/dashboard/orders/${order.id}`)
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/orders/${id}`)
  return { ok: true }
}

export async function updatePaymentStatus(id: string, payment_status: PaymentStatus): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('orders').update({ payment_status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/orders/${id}`)
  return { ok: true }
}

export async function assignVendor(id: string, vendorId: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({
      assigned_vendor_id: vendorId || null,
      status: vendorId ? 'vendor_assigned' : 'confirmed',
    })
    .eq('id', id)
  if (error) return { error: error.message }

  // Tell the partner's phone. Best-effort: the assignment is already saved,
  // and a push failure (no token yet, dead device) must not roll it back.
  if (vendorId) {
    const push = await notifyVendorOfAssignment(supabase, id, vendorId)
    if (!push.sent && push.reason !== 'no-token') {
      console.warn(`[push] assignment push not sent for ${id}: ${push.reason} ${push.detail ?? ''}`)
    }
  }

  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/orders/${id}`)
  return { ok: true }
}

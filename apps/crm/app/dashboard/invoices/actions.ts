'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceStatus, TablesUpdate } from '@prime/shared'

type Result = { error: string } | { ok: true }

/** Create a draft invoice from an order (auto line items/totals via the order). */
export async function createInvoiceFromOrder(orderId: string): Promise<Result> {
  const supabase = await createClient()

  const { data: existing } = await supabase.from('invoices').select('id').eq('order_id', orderId).maybeSingle()
  if (existing) redirect(`/dashboard/invoices/${existing.id}`)

  const { data: order, error } = await supabase
    .from('orders')
    .select('id,customer_id,subtotal,discount,tax,total')
    .eq('id', orderId)
    .single()
  if (error || !order) return { error: error?.message ?? 'Order not found' }

  const due = new Date()
  due.setDate(due.getDate() + 7)

  const { data: invoice, error: insErr } = await supabase
    .from('invoices')
    .insert({
      order_id: order.id,
      customer_id: order.customer_id,
      subtotal: order.subtotal,
      discount: order.discount ?? 0,
      tax: order.tax ?? 0,
      total: order.total,
      status: 'draft',
      due_date: due.toISOString().split('T')[0],
    })
    .select('id')
    .single()
  if (insErr || !invoice) return { error: insErr?.message ?? 'Could not create invoice' }

  revalidatePath('/dashboard/invoices')
  redirect(`/dashboard/invoices/${invoice.id}`)
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Result> {
  const supabase = await createClient()
  const patch: TablesUpdate<'invoices'> = { status }
  if (status === 'paid') patch.paid_at = new Date().toISOString()
  const { error } = await supabase.from('invoices').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${id}`)
  return { ok: true }
}

/** Mark paid — also flips the linked order's payment_status to paid. */
export async function markInvoicePaid(id: string, method: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: method || null })
    .eq('id', id)
  if (error) return { error: error.message }

  const { data: inv } = await supabase.from('invoices').select('order_id').eq('id', id).single()
  if (inv?.order_id) {
    await supabase
      .from('orders')
      .update({ payment_status: 'paid', payment_method: method || null })
      .eq('id', inv.order_id)
  }

  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${id}`)
  return { ok: true }
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceStatus } from '@prime/shared'
import { InvoiceView } from '@/components/invoices/invoice-view'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, order:orders(order_number,address,city,scheduled_date), customer:customers(name,phone,email)')
    .eq('id', id)
    .single()
  if (!invoice) notFound()

  let items: { service_name: string; unit_price: number; qty: number; line_total: number }[] = []
  if (invoice.order_id) {
    const { data } = await supabase
      .from('order_items')
      .select('service_name,unit_price,qty,line_total')
      .eq('order_id', invoice.order_id)
    items = (data ?? []).map((it) => ({
      service_name: it.service_name,
      unit_price: Number(it.unit_price),
      qty: it.qty,
      line_total: Number(it.line_total),
    }))
  }

  const order = invoice.order as { order_number: string; address: string; scheduled_date: string | null } | null
  const customer = invoice.customer as { name: string; phone: string; email: string | null } | null

  return (
    <InvoiceView
      invoice={{
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: invoice.status as InvoiceStatus,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        subtotal: Number(invoice.subtotal),
        discount: Number(invoice.discount ?? 0),
        tax: Number(invoice.tax ?? 0),
        total: Number(invoice.total),
        payment_method: invoice.payment_method,
        paid_at: invoice.paid_at,
        orderNumber: order?.order_number ?? null,
        address: order?.address ?? '',
        scheduledDate: order?.scheduled_date ?? null,
        customerName: customer?.name ?? '—',
        customerPhone: customer?.phone ?? '',
        customerEmail: customer?.email ?? null,
        items,
      }}
    />
  )
}

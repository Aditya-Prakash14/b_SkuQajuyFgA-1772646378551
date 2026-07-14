import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus, PaymentStatus } from '@prime/shared'
import { OrderDetail } from '@/components/orders/order-detail'

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(
      '*, customer:customers(name,phone,email,city), items:order_items(id,service_id,service_name,unit_price,qty,line_total), vendor:vendors(id,name,phone)',
    )
    .eq('id', id)
    .single()
  if (!order) notFound()

  const rawItems = (order.items as { id: string; service_id: string | null; service_name: string; unit_price: number; qty: number; line_total: number }[]) ?? []
  const items = rawItems.map((i) => ({
    id: i.id,
    service_name: i.service_name,
    unit_price: Number(i.unit_price),
    qty: i.qty,
    line_total: Number(i.line_total),
  }))

  const serviceIds = rawItems.map((i) => i.service_id).filter((v): v is string => Boolean(v))

  let eligibleVendors: { id: string; name: string; phone: string }[] = []
  if (serviceIds.length && order.city) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id,name,phone')
      .eq('status', 'active')
      .eq('city', order.city)
      .overlaps('services_offered', serviceIds)
    eligibleVendors = vendors ?? []
  }

  const detail = {
    id: order.id,
    order_number: order.order_number,
    status: order.status as OrderStatus,
    payment_status: (order.payment_status ?? 'unpaid') as PaymentStatus,
    city: order.city,
    address: order.address,
    scheduled_date: order.scheduled_date,
    created_at: order.created_at ?? '',
    source: order.source ?? 'website',
    subtotal: Number(order.subtotal),
    discount: Number(order.discount ?? 0),
    tax: Number(order.tax ?? 0),
    total: Number(order.total),
    notes: order.notes,
    assigned_vendor_id: order.assigned_vendor_id,
    customer: order.customer as { name: string; phone: string; email: string | null; city: string | null } | null,
    vendor: order.vendor as { id: string; name: string; phone: string } | null,
  }

  return <OrderDetail order={detail} items={items} eligibleVendors={eligibleVendors} />
}

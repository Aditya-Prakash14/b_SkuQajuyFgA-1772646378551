import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus, PaymentStatus } from '@prime/shared'
import { Button } from '@/components/ui/button'
import { OrdersTable, type OrderRow } from '@/components/orders/orders-table'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('id,order_number,status,payment_status,city,scheduled_date,total,created_at,source,customer:customers(name,phone)')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows: OrderRow[] = (data ?? []).map((o) => {
    const customer = o.customer as { name: string; phone: string } | null
    return {
      id: o.id,
      order_number: o.order_number,
      status: o.status as OrderStatus,
      payment_status: (o.payment_status ?? 'unpaid') as PaymentStatus,
      city: o.city,
      scheduled_date: o.scheduled_date,
      total: Number(o.total),
      created_at: o.created_at ?? '',
      source: o.source ?? 'website',
      customerName: customer?.name ?? '—',
      customerPhone: customer?.phone ?? '',
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Orders &amp; Bookings</h1>
          <p className="text-muted-foreground">Every booking, tracked through fulfillment</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/orders/new">
            <Plus className="h-4 w-4" /> New order
          </Link>
        </Button>
      </div>

      <OrdersTable orders={rows} />
    </div>
  )
}

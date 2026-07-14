import Link from 'next/link'
import { CalendarClock, IndianRupee, UserCog, FileWarning } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import { formatINR, type OrderStatus } from '@prime/shared'
import { OrderStatusBadge } from '@/components/status-badge'
import { cn } from '@/lib/utils'
import { RevenueByCategoryChart, BookingsByCityChart } from '@/components/dashboard/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

type Data = {
  kpis: { todaysBookings: number; revenueThisMonth: number; pendingAssignments: number; overdueInvoices: number }
  revenueByCategory: { category: string; revenue: number }[]
  bookingsByCity: { city: string; count: number }[]
  recentOrders: { id: string; order_number: string; status: OrderStatus; total: number; customer: string; created_at: string }[]
}

async function getData(): Promise<Data | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const supabase = await createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [todays, paid, pending, overdue, items, cityRows, recent] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('orders').select('total').eq('payment_status', 'paid').gte('created_at', monthStart.toISOString()),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').is('assigned_vendor_id', null),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
      supabase.from('order_items').select('line_total, service:services(category:service_categories(name))'),
      supabase.from('orders').select('city'),
      supabase.from('orders').select('id,order_number,status,total,created_at,customer:customers(name)').order('created_at', { ascending: false }).limit(6),
    ])

    const catMap = new Map<string, number>()
    for (const r of (items.data as { line_total: number; service: { category: { name: string } | null } | null }[]) ?? []) {
      const cat = r.service?.category?.name ?? 'Uncategorized'
      catMap.set(cat, (catMap.get(cat) ?? 0) + Number(r.line_total ?? 0))
    }
    const cityMap = new Map<string, number>()
    for (const r of (cityRows.data as { city: string }[]) ?? []) {
      cityMap.set(r.city, (cityMap.get(r.city) ?? 0) + 1)
    }

    return {
      kpis: {
        todaysBookings: todays.count ?? 0,
        revenueThisMonth: (paid.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0),
        pendingAssignments: pending.count ?? 0,
        overdueInvoices: overdue.count ?? 0,
      },
      revenueByCategory: [...catMap.entries()].map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue),
      bookingsByCity: [...cityMap.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 8),
      recentOrders: (recent.data ?? []).map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status as OrderStatus,
        total: Number(o.total),
        customer: (o.customer as { name: string } | null)?.name ?? '—',
        created_at: o.created_at ?? '',
      })),
    }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const data = await getData()
  const k = data?.kpis

  const cards = [
    { label: "Today's bookings", value: k ? String(k.todaysBookings) : '—', icon: CalendarClock, hint: 'New orders created today', tint: 'bg-primary/10 text-primary' },
    { label: 'Revenue this month', value: k ? formatINR(k.revenueThisMonth) : '—', icon: IndianRupee, hint: 'Paid orders, month to date', tint: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    { label: 'Pending assignments', value: k ? String(k.pendingAssignments) : '—', icon: UserCog, hint: 'Confirmed orders without a vendor', tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { label: 'Overdue invoices', value: k ? String(k.overdueInvoices) : '—', icon: FileWarning, hint: 'Invoices past their due date', tint: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Dashboard</h1>
        <p className="text-muted-foreground">Operations at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', c.tint)}>
                  <c.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
              </div>
              <p className="mt-3 text-3xl font-black tabular-nums">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
            <CardDescription>Gross booked value across service categories</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueByCategoryChart data={data?.revenueByCategory ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bookings by city</CardTitle>
            <CardDescription>Order volume, top cities</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingsByCityChart data={data?.bookingsByCity ?? []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>Latest bookings across the business</CardDescription>
        </CardHeader>
        <CardContent>
          {!data || data.recentOrders.length === 0 ? (
            <div className="grid h-32 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
              {data ? 'No orders yet' : 'Connect Supabase to load orders'}
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Customer</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                  <TH>Placed</TH>
                </TR>
              </THead>
              <TBody>
                {data.recentOrders.map((o) => (
                  <TR key={o.id} className="cursor-pointer">
                    <TD>
                      <Link href={`/dashboard/orders/${o.id}`} className="font-medium hover:text-primary">
                        {o.order_number}
                      </Link>
                    </TD>
                    <TD>{o.customer}</TD>
                    <TD className="whitespace-nowrap font-medium">{formatINR(o.total)}</TD>
                    <TD><OrderStatusBadge status={o.status} /></TD>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

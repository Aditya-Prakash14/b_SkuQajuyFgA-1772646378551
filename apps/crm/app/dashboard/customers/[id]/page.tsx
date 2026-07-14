import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatINR, type OrderStatus } from '@prime/shared'
import { OrderStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single()
  if (!customer) notFound()

  const [{ data: addresses }, { data: orders }] = await Promise.all([
    supabase.from('addresses').select('*').eq('customer_id', id),
    supabase
      .from('orders')
      .select('id,order_number,status,total,scheduled_date,created_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ])

  const orderList = orders ?? []
  const totalSpent = orderList.reduce((sum, o) => sum + Number(o.total ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black">{customer.name}</h1>
          <p className="text-muted-foreground">
            Customer since {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order history</CardTitle>
              <CardDescription>
                {orderList.length} orders · {formatINR(totalSpent)} lifetime
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orderList.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Order</TH>
                      <TH>Scheduled</TH>
                      <TH>Total</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {orderList.map((o) => (
                      <TR key={o.id} className="cursor-pointer">
                        <TD>
                          <Link href={`/dashboard/orders/${o.id}`} className="font-medium hover:text-primary">
                            {o.order_number}
                          </Link>
                        </TD>
                        <TD className="whitespace-nowrap">
                          {o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString('en-IN') : '—'}
                        </TD>
                        <TD className="whitespace-nowrap font-medium">{formatINR(Number(o.total))}</TD>
                        <TD>
                          <OrderStatusBadge status={o.status as OrderStatus} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" /> {customer.phone}
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {customer.email}
                </div>
              )}
              {customer.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {customer.city}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(addresses ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved addresses.</p>
              ) : (
                (addresses ?? []).map((a) => (
                  <div key={a.id} className="rounded-lg border p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium">{a.label ?? 'Address'}</span>
                      {a.is_default && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <p className="text-muted-foreground">{a.full_address}</p>
                    <p className="text-muted-foreground">{a.city}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

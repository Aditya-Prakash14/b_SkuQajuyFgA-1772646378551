import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatINR, type OrderStatus } from '@prime/shared'
import { OrderStatusBadge } from '@/components/status-badge'
import { VendorForm } from '@/components/vendors/vendor-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vendor } = await supabase.from('vendors').select('*').eq('id', id).single()
  if (!vendor) notFound()

  const [{ data: services }, { data: cities }, { data: orders }] = await Promise.all([
    supabase.from('services').select('id,name').order('name'),
    supabase.from('cities').select('name').eq('is_active', true).order('name'),
    supabase
      .from('orders')
      .select('id,order_number,status,total,city,created_at')
      .eq('assigned_vendor_id', id)
      .order('created_at', { ascending: false }),
  ])

  const history = orders ?? []

  return (
    <div className="space-y-6">
      <VendorForm
        mode="edit"
        vendorId={id}
        initial={vendor}
        services={services ?? []}
        cities={(cities ?? []).map((c) => c.name)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Assignment history</CardTitle>
          <CardDescription>Orders assigned to this vendor</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>City</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {history.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/dashboard/orders/${o.id}`} className="font-medium hover:text-primary">
                        {o.order_number}
                      </Link>
                    </TD>
                    <TD>{o.city}</TD>
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
  )
}

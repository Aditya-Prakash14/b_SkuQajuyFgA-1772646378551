import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatINR, type OrderStatus } from '@prime/shared'
import { OrderStatusBadge } from '@/components/status-badge'
import { GenerateInvoiceButton } from '@/components/invoices/generate-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

export default async function NewInvoicePage() {
  const supabase = await createClient()

  const [{ data: orders }, { data: invoices }] = await Promise.all([
    supabase
      .from('orders')
      .select('id,order_number,status,total,city,created_at,customer:customers(name)')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    supabase.from('invoices').select('order_id'),
  ])

  const invoiced = new Set((invoices ?? []).map((i) => i.order_id))
  const eligible = (orders ?? []).filter((o) => !invoiced.has(o.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black">Generate invoice</h1>
          <p className="text-muted-foreground">Pick an order to bill (completed orders are typical)</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uninvoiced orders</CardTitle>
          <CardDescription>{eligible.length} orders without an invoice</CardDescription>
        </CardHeader>
        <CardContent>
          {eligible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Every order already has an invoice.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Customer</TH>
                  <TH>City</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {eligible.map((o) => (
                  <TR key={o.id}>
                    <TD className="font-medium">{o.order_number}</TD>
                    <TD>{(o.customer as { name: string } | null)?.name ?? '—'}</TD>
                    <TD>{o.city}</TD>
                    <TD className="whitespace-nowrap font-medium">{formatINR(Number(o.total))}</TD>
                    <TD>
                      <OrderStatusBadge status={o.status as OrderStatus} />
                    </TD>
                    <TD className="text-right">
                      <GenerateInvoiceButton orderId={o.id} />
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

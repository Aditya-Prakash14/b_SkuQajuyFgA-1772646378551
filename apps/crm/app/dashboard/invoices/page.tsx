import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceStatus } from '@prime/shared'
import { Button } from '@/components/ui/button'
import { InvoicesTable, type InvoiceRow } from '@/components/invoices/invoices-table'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select('id,invoice_number,status,issue_date,due_date,total,order:orders(order_number),customer:customers(name)')
    .order('created_at', { ascending: false })

  const rows: InvoiceRow[] = (data ?? []).map((v) => ({
    id: v.id,
    invoice_number: v.invoice_number,
    status: v.status as InvoiceStatus,
    issue_date: v.issue_date,
    due_date: v.due_date,
    total: Number(v.total),
    orderNumber: (v.order as { order_number: string } | null)?.order_number ?? '—',
    customerName: (v.customer as { name: string } | null)?.name ?? '—',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Invoices</h1>
          <p className="text-muted-foreground">Bill completed orders &amp; track payment</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/invoices/new">
            <Plus className="h-4 w-4" /> New invoice
          </Link>
        </Button>
      </div>
      <InvoicesTable invoices={rows} />
    </div>
  )
}

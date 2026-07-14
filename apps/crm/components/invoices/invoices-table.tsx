'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { InvoiceStatus } from '@prime/shared'
import { formatINR } from '@prime/shared'
import { InvoiceStatusBadge, INVOICE_STATUSES, invoiceStatusLabel } from '@/components/status-badge'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface InvoiceRow {
  id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string | null
  due_date: string | null
  total: number
  orderNumber: string
  customerName: string
}

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: invoices.length }
    for (const s of INVOICE_STATUSES) c[s] = invoices.filter((i) => i.status === s).length
    return c
  }, [invoices])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices.filter((i) => {
      if (status !== 'all' && i.status !== status) return false
      if (
        q &&
        !i.invoice_number.toLowerCase().includes(q) &&
        !i.customerName.toLowerCase().includes(q) &&
        !i.orderNumber.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [invoices, query, status])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by invoice #, customer or order…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={status === 'all'} onClick={() => setStatus('all')} label="All" count={counts.all} />
        {INVOICE_STATUSES.map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)} label={invoiceStatusLabel(s)} count={counts[s]} />
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <THead>
            <TR>
              <TH>Invoice</TH>
              <TH>Customer</TH>
              <TH>Order</TH>
              <TH>Issued</TH>
              <TH>Due</TH>
              <TH>Total</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((i) => (
              <TR key={i.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/invoices/${i.id}`)}>
                <TD className="font-medium">{i.invoice_number}</TD>
                <TD>{i.customerName}</TD>
                <TD className="text-muted-foreground">{i.orderNumber}</TD>
                <TD className="whitespace-nowrap">{i.issue_date ? new Date(i.issue_date).toLocaleDateString('en-IN') : '—'}</TD>
                <TD className="whitespace-nowrap">{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</TD>
                <TD className="whitespace-nowrap font-medium">{formatINR(i.total)}</TD>
                <TD><InvoiceStatusBadge status={i.status} /></TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR>
                <TD className="py-10 text-center text-muted-foreground" colSpan={7}>
                  No invoices. Generate one from a completed order.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  )
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted',
      )}
    >
      {label}
      <Badge variant={active ? 'secondary' : 'outline'} className="px-1.5 py-0">{count}</Badge>
    </button>
  )
}

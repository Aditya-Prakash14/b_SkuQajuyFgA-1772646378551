'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { OrderStatus, PaymentStatus } from '@prime/shared'
import { formatINR } from '@prime/shared'
import { OrderStatusBadge, PaymentStatusBadge, ORDER_STATUSES, orderStatusLabel } from '@/components/status-badge'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface OrderRow {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  city: string
  scheduled_date: string | null
  total: number
  created_at: string
  source: string
  customerName: string
  customerPhone: string
}

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | OrderStatus>('all')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const s of ORDER_STATUSES) c[s] = orders.filter((o) => o.status === s).length
    return c
  }, [orders])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false
      if (
        q &&
        !o.order_number.toLowerCase().includes(q) &&
        !o.customerName.toLowerCase().includes(q) &&
        !o.customerPhone.includes(q)
      )
        return false
      return true
    })
  }, [orders, query, status])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by order #, customer name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={status === 'all'} onClick={() => setStatus('all')} label="All" count={counts.all} />
        {ORDER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={status === s}
            onClick={() => setStatus(s)}
            label={orderStatusLabel(s)}
            count={counts[s]}
          />
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <THead>
            <TR>
              <TH>Order</TH>
              <TH>Customer</TH>
              <TH>City</TH>
              <TH>Scheduled</TH>
              <TH>Total</TH>
              <TH>Payment</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((o) => (
              <TR key={o.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/orders/${o.id}`)}>
                <TD>
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.source} · {new Date(o.created_at).toLocaleDateString('en-IN')}
                  </p>
                </TD>
                <TD>
                  <p className="font-medium">{o.customerName}</p>
                  <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                </TD>
                <TD>{o.city}</TD>
                <TD className="whitespace-nowrap">
                  {o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString('en-IN') : '—'}
                </TD>
                <TD className="whitespace-nowrap font-medium">{formatINR(o.total)}</TD>
                <TD><PaymentStatusBadge status={o.payment_status} /></TD>
                <TD><OrderStatusBadge status={o.status} /></TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR>
                <TD className="py-10 text-center text-muted-foreground" colSpan={7}>
                  No orders yet. Create one manually, or wait for website bookings (Phase 11).
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  )
}

function FilterChip({
  active, onClick, label, count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      aria-pressed={active}
      className={cn('rounded-full', !active && 'text-muted-foreground')}
    >
      {label}
      <Badge variant={active ? 'secondary' : 'outline'} className="px-1.5 py-0">
        {count}
      </Badge>
    </Button>
  )
}

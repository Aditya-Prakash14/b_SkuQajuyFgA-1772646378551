'use client'

import { useState, useTransition } from 'react'
import { Clock, MapPin, Phone, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { formatINR } from '@prime/shared'
import {
  assignPrimeNowVendor,
  updatePrimeNowStatus,
  type PrimeNowStatus,
} from '@/app/dashboard/prime-now/actions'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

export interface PrimeNowRow {
  id: string
  request_number: string
  name: string
  phone: string
  address: string
  city: string | null
  slot: string
  slot_minutes: number
  price: number
  tasks: string[]
  notes: string | null
  timing: 'now' | 'scheduled'
  scheduled_for: string | null
  status: PrimeNowStatus
  assigned_vendor_id: string | null
  created_at: string
}

const STATUSES: PrimeNowStatus[] = ['new', 'dispatched', 'in_progress', 'completed', 'cancelled']

const TONE: Record<PrimeNowStatus, 'warning' | 'default' | 'brand' | 'success' | 'destructive'> = {
  new: 'warning',
  dispatched: 'default',
  in_progress: 'brand',
  completed: 'success',
  cancelled: 'destructive',
}

const TASK_LABEL: Record<string, string> = {
  sweeping_mopping: 'Sweeping & mopping',
  utensils: 'Utensils & dishes',
  dusting: 'Dusting & wiping',
  laundry: 'Laundry',
  ironing: 'Ironing & folding',
  kitchen_prep: 'Kitchen prep',
  bathroom: 'Bathroom',
  fridge: 'Fridge',
  balcony: 'Balcony',
  wardrobe: 'Wardrobe',
  party: 'Before/after a party',
  moving: 'Packing & moving',
  other: 'Something else',
}

function when(r: PrimeNowRow) {
  if (r.timing === 'now') return 'ASAP — within the hour'
  if (!r.scheduled_for) return 'To be scheduled'
  return new Date(r.scheduled_for).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export function PrimeNowRequestsTable({
  rows,
  vendors,
}: {
  rows: PrimeNowRow[]
  vendors: { id: string; name: string; city: string | null }[]
}) {
  const [items, setItems] = useState(rows)
  const [, start] = useTransition()

  function run(id: string, patch: Partial<PrimeNowRow>, fn: () => Promise<{ error: string } | { ok: true }>, ok: string) {
    const prev = items
    setItems((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    start(async () => {
      const res = await fn()
      if ('error' in res) {
        toast.error(res.error)
        setItems(prev)
      } else {
        toast.success(ok)
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        No Prime Now requests yet. They arrive here the moment someone submits the form on the site.
      </div>
    )
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Request</TH>
          <TH>Customer</TH>
          <TH>Job</TH>
          <TH>When</TH>
          <TH>Price</TH>
          <TH>Partner</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {items.map((r) => (
          <TR key={r.id}>
            <TD>
              <span className="font-medium">{r.request_number}</span>
              <span className="block text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </TD>
            <TD>
              <span className="font-medium">{r.name}</span>
              <a
                href={`tel:${r.phone}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <Phone className="h-3 w-3" /> {r.phone}
              </a>
              <span className="flex max-w-56 items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="truncate">
                  {r.address}
                  {r.city ? `, ${r.city}` : ''}
                </span>
              </span>
            </TD>
            <TD>
              <span className="flex items-center gap-1 text-xs font-medium">
                <Clock className="h-3 w-3" /> {r.slot_minutes} min
              </span>
              <span className="block max-w-64 text-xs text-muted-foreground">
                {r.tasks.length
                  ? r.tasks.map((t) => TASK_LABEL[t] ?? t).join(', ')
                  : 'Not specified'}
              </span>
              {r.notes && <span className="block max-w-64 text-xs italic text-muted-foreground">“{r.notes}”</span>}
            </TD>
            <TD>
              <span className="flex items-center gap-1 text-xs">
                {r.timing === 'now' && <Zap className="h-3 w-3 text-warning" />}
                {when(r)}
              </span>
            </TD>
            <TD className="whitespace-nowrap font-medium tabular-nums">{formatINR(Number(r.price))}</TD>
            <TD>
              <Select
                value={r.assigned_vendor_id ?? undefined}
                onValueChange={(v) =>
                  run(
                    r.id,
                    { assigned_vendor_id: v, status: 'dispatched' },
                    () => assignPrimeNowVendor(r.id, v),
                    'Partner assigned',
                  )
                }
              >
                <SelectTrigger size="sm" className="w-40 text-xs">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                      {v.city ? ` · ${v.city}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TD>
            <TD>
              <Select
                value={r.status}
                onValueChange={(v) =>
                  run(
                    r.id,
                    { status: v as PrimeNowStatus },
                    () => updatePrimeNowStatus(r.id, v as PrimeNowStatus),
                    `Moved to ${v.replace('_', ' ')}`,
                  )
                }
              >
                <SelectTrigger size="sm" className="w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={TONE[r.status]} className="mt-1 capitalize">
                {r.status.replace('_', ' ')}
              </Badge>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

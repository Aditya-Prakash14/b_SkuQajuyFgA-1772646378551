'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, MapPin, MessageCircle, Phone, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { formatINR } from '@prime/shared'
import {
  assignPrimeNowVendor,
  dispatchPrimeNow,
  updatePrimeNowStatus,
  type PrimeNowStatus,
} from '@/app/dashboard/prime-now/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  /** Live offers currently sitting with partners. */
  openOffers: number
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

/**
 * A status-appropriate WhatsApp message to the customer.
 *
 * Sending is manual on purpose: there is no SMS/WhatsApp Business provider
 * wired up yet, so rather than pretend to automate it we hand ops a prefilled
 * chat. Swap this for a provider call when one exists.
 */
function notifyHref(r: PrimeNowRow) {
  const lines: Record<PrimeNowStatus, string> = {
    new: `Hi ${r.name}, we have your Prime Now request ${r.request_number} and are finding a helper near you.`,
    dispatched: `Hi ${r.name}, a verified helper has accepted your request ${r.request_number} and is on the way.`,
    in_progress: `Hi ${r.name}, your helper has started work on ${r.request_number}.`,
    completed: `Hi ${r.name}, your Prime Now job ${r.request_number} is complete. Thank you for choosing My Prime Company!`,
    cancelled: `Hi ${r.name}, your Prime Now request ${r.request_number} has been cancelled. Please call us if this is unexpected.`,
  }
  return `https://wa.me/91${r.phone.replace(/D/g, '').slice(-10)}?text=${encodeURIComponent(lines[r.status])}`
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
  const router = useRouter()
  const [, start] = useTransition()

  // Optimistic edits are overlays on the server rows, never a copy of them —
  // so a refresh can never be masked by stale local state.
  const [patches, setPatches] = useState<Record<string, Partial<PrimeNowRow>>>({})

  // Booking no longer hands off to WhatsApp, so this queue is the only place a
  // Prime Now job exists — ops should not have to refresh to see one arrive.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20000)
    return () => clearInterval(t)
  }, [router])

  // Adjusting state during render (React's documented alternative to a
  // prop-sync effect): once the server sends different rows, drop the overlays.
  const rowsKey = rows.map((r) => `${r.id}:${r.status}:${r.assigned_vendor_id ?? ''}`).join('|')
  const [seenKey, setSeenKey] = useState(rowsKey)
  if (rowsKey !== seenKey) {
    setSeenKey(rowsKey)
    setPatches({})
  }

  const items = rows.map((r) => (patches[r.id] ? { ...r, ...patches[r.id] } : r))

  function run(id: string, patch: Partial<PrimeNowRow>, fn: () => Promise<{ error: string } | { ok: true }>, ok: string) {
    setPatches((p) => ({ ...p, [id]: { ...p[id], ...patch } }))
    start(async () => {
      const res = await fn()
      if ('error' in res) {
        toast.error(res.error)
        setPatches((p) => {
          const next = { ...p }
          delete next[id]
          return next
        })
      } else {
        toast.success(ok)
        router.refresh()
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
              <a
                href={notifyHref(r)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <MessageCircle className="h-3 w-3" /> Update customer
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
              {!r.assigned_vendor_id && (
                <div className="mb-1.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() =>
                      start(async () => {
                        const res = await dispatchPrimeNow(r.id)
                        if ('error' in res) toast.error(res.error)
                        else if (res.sent === 0) toast.warning('No online partner matches this city right now')
                        else toast.success(`Offered to ${res.sent} partner${res.sent === 1 ? '' : 's'}`)
                      })
                    }
                  >
                    Find a partner
                  </Button>
                  {r.openOffers > 0 && (
                    <span className="text-xs text-muted-foreground">{r.openOffers} out</span>
                  )}
                </div>
              )}
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

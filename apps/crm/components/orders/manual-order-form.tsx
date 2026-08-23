'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatINR } from '@prime/shared'
import { createManualOrder } from '@/app/dashboard/orders/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SvcOpt {
  id: string
  name: string
  price: number
  label: string
}

/**
 * Nobody books 110 deep cleans. A mistyped quantity here once produced a
 * ₹659,890 order that was marked paid and skewed revenue, so the value is
 * clamped rather than merely floored at 1.
 */
const MAX_QTY = 20
const clampQty = (n: number) => Math.min(Math.max(Number.isFinite(n) ? n : 1, 1), MAX_QTY)

export function ManualOrderForm({ services, cities }: { services: SvcOpt[]; cities: string[] }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{ service_id: string; qty: number }[]>(
    services.length ? [{ service_id: services[0].id, qty: 1 }] : [],
  )
  const [submitting, setSubmitting] = useState(false)

  const priceOf = (id: string) => services.find((s) => s.id === id)?.price ?? 0
  const subtotal = items.reduce((sum, it) => sum + priceOf(it.service_id) * clampQty(it.qty), 0)

  function addItem() {
    if (services.length) setItems((p) => [...p, { service_id: services[0].id, qty: 1 }])
  }
  function patchItem(i: number, patch: Partial<{ service_id: string; qty: number }>) {
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function removeItem(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await createManualOrder({
      customer: { name, phone, email, city },
      address,
      scheduled_date: date || null,
      notes: notes || null,
      items,
    })
    if (res && 'error' in res) {
      toast.error(res.error)
      setSubmitting(false)
    }
    // success redirects to the new order server-side
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" type="button">
            <Link href="/dashboard/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black">New order</h1>
            <p className="text-muted-foreground">Phone-in booking (source: crm)</p>
          </div>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create order
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
              </div>
              <div>
                <Label className="mb-1.5 block">Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={10}
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Email (optional)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
              </div>
              <div>
                <Label className="mb-1.5 block">City</Label>
                <Select value={city || undefined} onValueChange={setCity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Address</Label>
                <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat / House No., Street, Area" />
              </div>
              <div>
                <Label className="mb-1.5 block">Preferred date</Label>
                <Input type="date" min={minDateStr} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Services</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                  <Select
                    value={it.service_id || undefined}
                    onValueChange={(v) => patchItem(i, { service_id: v })}
                  >
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {s.label || formatINR(s.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_QTY}
                    value={it.qty}
                    onChange={(e) => patchItem(i, { qty: clampQty(Number(e.target.value)) })}
                    className="w-20"
                  />
                  <span className="w-24 text-right text-sm font-medium tabular-nums">
                    {formatINR(priceOf(it.service_id) * clampQty(it.qty))}
                  </span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {services.length === 0 && (
                <p className="text-sm text-muted-foreground">No active services — add one under Services first.</p>
              )}
              <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!services.length}>
                <Plus className="h-4 w-4" /> Add service
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((it, i) => {
                const s = services.find((x) => x.id === it.service_id)
                if (!s) return null
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="mr-2 truncate text-muted-foreground">
                      {s.name} × {clampQty(it.qty)}
                    </span>
                    <span className="whitespace-nowrap font-medium">
                      {formatINR(s.price * clampQty(it.qty))}
                    </span>
                  </div>
                )
              })}
              <div className="flex justify-between border-t pt-3 text-base font-bold">
                <span>Total</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Prices are re-validated server-side from the live catalog on submit.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CalendarClock, Clock, MapPin, Loader2, X, RotateCcw, Star, CheckCircle,
} from 'lucide-react'
import { formatINR, gstHalves } from '@prime/shared'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { statusMeta, CUSTOMER_EDITABLE } from '@/lib/order-status'
import type { OrderStatus } from '@prime/shared'
import { TIME_SLOTS } from '@/lib/slots'
import { StarInput, Stars } from '@/components/account/star-rating'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

/** Radix Select reserves "", so "keep the current slot" needs a sentinel value. */
const KEEP_SLOT = '__keep__'

interface Item {
  id: string
  service_id: string | null
  service_name: string
  unit_price: number
  qty: number
  line_total: number
  service: { slug: string; hero_img: string | null; price: number; display_price_label: string | null; is_active: boolean | null } | null
}
interface Order {
  id: string
  order_number: string
  status: OrderStatus
  scheduled_date: string | null
  scheduled_slot: string | null
  city: string
  address: string
  subtotal: number
  tax: number | null
  total: number
  notes: string | null
  created_at: string | null
  items: Item[]
}
interface ReviewRow {
  service_id: string | null
  rating: number
  comment: string | null
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: o }, { data: r }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, status, scheduled_date, scheduled_slot, city, address, subtotal, tax, total, notes, created_at, items:order_items(id, service_id, service_name, unit_price, qty, line_total, service:services(slug, hero_img, price, display_price_label, is_active))')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('reviews').select('service_id, rating, comment').eq('order_id', id),
    ])
    if (!o) { setNotFound(true); setLoading(false); return }
    setOrder(o as unknown as Order)
    const map: Record<string, ReviewRow> = {}
    for (const row of (r as ReviewRow[] | null) ?? []) if (row.service_id) map[row.service_id] = row
    setReviews(map)
    setLoading(false)
  }, [id])

  useEffect(() => { if (user) load() }, [user, load])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  if (notFound || !order) {
    return (
      <div className="text-center py-16">
        <p className="font-bold text-gray-800">Booking not found</p>
        <Link href="/account" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary font-semibold"><ArrowLeft className="w-4 h-4" /> Back to bookings</Link>
      </div>
    )
  }

  const meta = statusMeta(order.status)
  const editable = CUSTOMER_EDITABLE.includes(order.status)
  const { cgst, sgst } = gstHalves(Number(order.tax ?? 0))

  return (
    <div className="space-y-5">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to bookings
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-black text-gray-900">{order.order_number}</h2>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.className}`}>{meta.label}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Schedule */}
          <Card title="Schedule">
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-gray-400" />
                {order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
              </span>
              {order.scheduled_slot && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> {order.scheduled_slot}</span>}
            </div>
            {editable ? (
              <RescheduleAndCancel orderId={order.id} onDone={load} />
            ) : (
              <p className="mt-3 text-xs text-gray-400">
                This booking can no longer be changed online. Call us at{' '}
                <a href="tel:+917349603429" className="text-primary font-semibold">+91 73496 03429</a> for help.
              </p>
            )}
          </Card>

          {/* Address */}
          <Card title="Service address">
            <p className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{order.address}<br /><span className="text-gray-400">{order.city}</span></span>
            </p>
          </Card>

          {/* Items + totals */}
          <Card title="Services">
            <div className="divide-y divide-gray-100">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-gray-700">{it.service_name}{it.qty > 1 ? <span className="text-gray-400"> × {it.qty}</span> : null}</span>
                  <span className="font-semibold text-gray-800">{formatINR(Number(it.line_total))}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
              {Number(order.tax ?? 0) > 0 && (
                <>
                  <TotalRow label="Taxable value" value={formatINR(Number(order.subtotal))} muted />
                  <TotalRow label="CGST @ 9%" value={formatINR(cgst)} muted />
                  <TotalRow label="SGST @ 9%" value={formatINR(sgst)} muted />
                </>
              )}
              <div className="flex justify-between font-black text-primary pt-1">
                <span>Total paid</span><span>{formatINR(Number(order.total))}</span>
              </div>
            </div>
            <RebookButton items={order.items} />
          </Card>

          {order.notes && (
            <Card title="Your notes"><p className="text-sm text-gray-600">{order.notes}</p></Card>
          )}
        </div>

        {/* Reviews (completed only) */}
        <div className="space-y-5">
          {order.status === 'completed' ? (
            <Card title="Rate your service">
              <div className="space-y-4">
                {order.items.filter((it) => it.service_id).map((it) => (
                  <ReviewBlock
                    key={it.id}
                    orderId={order.id}
                    serviceId={it.service_id as string}
                    serviceName={it.service_name}
                    existing={reviews[it.service_id as string]}
                    onDone={load}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Reviews">
              <p className="text-sm text-gray-400">You can rate each service once the booking is completed.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function RescheduleAndCancel({ orderId, onDone }: { orderId: string; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<string>('')
  const [busy, setBusy] = useState<'save' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1)
  const minStr = minDate.toISOString().split('T')[0]

  async function reschedule() {
    if (!date) { setError('Please pick a new date'); return }
    setBusy('save'); setError(null)
    const { error } = await createClient().rpc('reschedule_booking', { p_order_id: orderId, p_date: date, p_slot: slot || undefined })
    setBusy(null)
    if (error) { setError(error.message); return }
    setOpen(false); await onDone()
  }
  async function cancel() {
    if (!confirm('Cancel this booking? This cannot be undone.')) return
    setBusy('cancel'); setError(null)
    const { error } = await createClient().rpc('cancel_booking', { p_order_id: orderId })
    setBusy(null)
    if (error) { setError(error.message); return }
    await onDone()
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      {!open ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="border-primary/30 font-semibold text-primary hover:bg-primary/5 hover:text-primary"
          >
            <CalendarClock /> Reschedule
          </Button>
          <Button
            variant="outline"
            onClick={cancel}
            disabled={busy === 'cancel'}
            className="border-destructive/30 font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            {busy === 'cancel' ? <Loader2 className="animate-spin" /> : <X />} Cancel
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="resch-date" className="text-xs text-muted-foreground">New date</Label>
              <Input id="resch-date" type="date" min={minStr} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="resch-slot" className="text-xs text-muted-foreground">Time slot</Label>
              <Select
                value={slot || KEEP_SLOT}
                onValueChange={(v) => setSlot(v === KEEP_SLOT ? '' : v)}
              >
                <SelectTrigger id="resch-slot" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_SLOT}>Keep current</SelectItem>
                  {TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={reschedule} disabled={busy === 'save'} className="font-semibold">
              {busy === 'save' && <Loader2 className="animate-spin" />} Save
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground">Discard</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function RebookButton({ items }: { items: Item[] }) {
  const { addToCart, setCartOpen } = useCart()
  const active = items.filter((it) => it.service_id && it.service?.is_active)
  if (active.length === 0) return null
  function rebook() {
    for (const it of active) {
      const s = it.service!
      addToCart({
        id: it.service_id as string,
        name: it.service_name,
        img: s.hero_img ?? '',
        price: Number(s.price),
        priceStr: s.display_price_label ?? formatINR(Number(s.price)),
      })
    }
    setCartOpen(true)
  }
  return (
    <Button
      variant="outline"
      onClick={rebook}
      className="mt-4 border-primary/30 font-semibold text-primary hover:bg-primary/5 hover:text-primary"
    >
      <RotateCcw /> Book again
    </Button>
  )
}

function ReviewBlock({
  orderId, serviceId, serviceName, existing, onDone,
}: {
  orderId: string
  serviceId: string
  serviceName: string
  existing?: ReviewRow
  onDone: () => Promise<void>
}) {
  const [editing, setEditing] = useState(!existing)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (rating < 1) { setError('Please choose a rating'); return }
    setBusy(true); setError(null)
    const { error } = await createClient().rpc('submit_review', {
      p_order_id: orderId, p_service_id: serviceId, p_rating: rating, p_comment: comment || undefined,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setEditing(false); await onDone()
  }

  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <p className="text-sm font-semibold text-gray-800">{serviceName}</p>
      {!editing && existing ? (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <Stars value={existing.rating} />
            <Button variant="link" onClick={() => setEditing(true)} className="h-auto p-0 text-xs font-semibold">
              Edit
            </Button>
          </div>
          {existing.comment && <p className="mt-1.5 text-sm text-gray-600">“{existing.comment}”</p>}
          <p className="mt-1 flex items-center gap-1 text-[11px] text-green-600"><CheckCircle className="w-3 h-3" /> Thanks for your review</p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <StarInput value={rating} onChange={setRating} />
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell others about your experience (optional)"
            className="resize-none"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={busy} className="font-semibold">
              {busy ? <Loader2 className="animate-spin" /> : <Star />} {existing ? 'Update' : 'Submit'}
            </Button>
            {existing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="text-muted-foreground">
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</p>
      {children}
    </div>
  )
}
function TotalRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-gray-500' : ''}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}

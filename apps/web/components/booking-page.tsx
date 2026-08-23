'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, Loader2, Mail, MapPin, MessageCircle, Phone, Trash2 } from 'lucide-react'
import { formatINR } from '@prime/shared'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { useCity } from '@/lib/city-context'
import { createClient } from '@/lib/supabase/client'
import { TIME_SLOTS } from '@/lib/slots'

/**
 * Booking page: the form on the left, a live cart and a "prefer to talk" panel
 * on the right. The cart is the same one the header counts — removing a line
 * here updates the badge immediately.
 */
export function BookingPage() {
  const { cart, removeFromCart, updateQty, totalPrice, clearCart } = useCart()
  const { city, setCity, cities } = useCity()
  const { user, signInWithGoogle } = useAuth()

  const [form, setForm] = useState({ name: '', phone: '', address: '', date: '', slot: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (cart.length === 0) return setError('Your cart is empty — add a service first.')
    if (!user) return setError('Please sign in so we can attach this booking to your account.')
    if (!form.name.trim()) return setError('Please enter your name.')
    if (!/^[6-9]\d{9}$/.test(form.phone)) return setError('Enter a valid 10-digit mobile number.')
    if (!city) return setError('Please select your city.')
    if (!form.address.trim()) return setError('Please enter the address.')
    if (!form.date) return setError('Please pick a date.')

    setBusy(true)
    try {
      const supabase = createClient()
      // create_booking re-prices every line from the live catalogue, so the
      // total below is an estimate until the server confirms it.
      const { data, error: rpcError } = await supabase.rpc('create_booking', {
        p_name: form.name.trim(),
        p_phone: form.phone,
        p_email: user.email ?? '',
        p_city: city,
        p_address: form.address.trim(),
        p_scheduled_date: form.date,
        p_slot: form.slot || undefined,
        p_notes: form.notes.trim() || undefined,
        p_items: cart.map((c) => ({ service_id: c.id, qty: c.qty, units: c.units ?? 1 })),
      })
      if (rpcError) throw rpcError
      const result = data as { order_id: string; order_number: string } | null
      setOrderNumber(result?.order_number ?? '')
      clearCart()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again or call us.')
    } finally {
      setBusy(false)
    }
  }

  if (orderNumber !== null) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-10 text-center shadow-panel">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
          <Check className="h-7 w-7" />
        </div>
        {orderNumber && <p className="label-mono text-muted-foreground">Booking {orderNumber}</p>}
        <h2 className="mt-3 text-2xl font-extrabold">Booking confirmed</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          We will call you to confirm the arrival window. You can track this booking in your
          account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/account"
            className="rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View my bookings
          </Link>
          <Link
            href="/deep-cleaning"
            className="rounded-2xl border border-border px-5 py-3 font-semibold transition-colors hover:border-primary hover:text-primary"
          >
            Book something else
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold">Book a service</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us where and when. We confirm every booking by phone.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Your name"
              className={inputCls}
            />
          </Field>
          <Field label="Phone number">
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit mobile"
              className={`tabular ${inputCls}`}
            />
          </Field>
          <Field label="City">
            <select value={city ?? ''} onChange={(e) => setCity(e.target.value)} className={inputCls}>
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preferred date">
            <input
              type="date"
              min={minDateStr}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Flat / house, street, landmark"
              className={inputCls}
            />
          </Field>
          <Field label="Time slot" className="sm:col-span-2">
            <select value={form.slot} onChange={(e) => set('slot', e.target.value)} className={inputCls}>
              <option value="">Any time — we&apos;ll confirm on call</option>
              {TIME_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes (optional)" className="sm:col-span-2">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Parking, pets, anything the crew should know."
              className={inputCls}
            />
          </Field>
        </div>

        {error && (
          <p className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        {!user && (
          <button
            type="button"
            onClick={() => signInWithGoogle('/contact')}
            className="mt-5 w-full rounded-2xl border border-border px-5 py-3.5 font-semibold transition-colors hover:border-primary hover:text-primary"
          >
            Sign in to continue
          </button>
        )}

        <button
          type="submit"
          disabled={busy || cart.length === 0}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Confirming…' : 'Confirm booking'}
        </button>
      </form>

      {/* ── Cart + talk to us ───────────────────────────────────────────── */}
      <aside className="space-y-4 lg:sticky lg:top-28">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-panel">
          <div className="flex items-baseline justify-between">
            <h2 className="font-extrabold">Your cart</h2>
            <span className="label-mono text-muted-foreground">
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {cart.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing here yet.{' '}
              <Link href="/deep-cleaning" className="font-semibold text-primary hover:underline">
                Browse deep cleaning
              </Link>
              .
            </p>
          ) : (
            <>
              <ul className="mt-4 divide-y divide-border">
                {cart.map((c) => (
                  <li key={c.id} className="flex gap-3 py-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {c.img && <Image src={c.img} alt="" fill sizes="48px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.priceStr}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQty(c.id, c.qty - 1)}
                          className="grid h-6 w-6 place-items-center rounded-lg border border-border text-sm"
                          aria-label={`Decrease quantity of ${c.name}`}
                        >
                          −
                        </button>
                        <span className="tabular w-5 text-center text-sm">{c.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(c.id, c.qty + 1)}
                          className="grid h-6 w-6 place-items-center rounded-lg border border-border text-sm"
                          aria-label={`Increase quantity of ${c.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(c.id)}
                      className="self-start text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Remove ${c.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                <span className="font-semibold">Estimated total</span>
                <span className="tabular text-2xl font-extrabold">{formatINR(totalPrice)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Final price is confirmed from the live catalogue when you book. Per-unit services
                are quoted after a site visit.
              </p>
            </>
          )}
        </div>

        <div className="rounded-3xl bg-ink p-6 text-ink-foreground">
          <h2 className="font-extrabold">Prefer to talk?</h2>
          <p className="mt-1.5 text-sm text-ink-foreground/70">
            We answer 7 days a week. Send photos for an accurate quote.
          </p>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <a
                href="https://wa.me/917349603429"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 transition-colors hover:text-brand"
              >
                <MessageCircle className="h-4 w-4 shrink-0" /> WhatsApp us
              </a>
            </li>
            <li>
              <a href="tel:+917349603429" className="flex items-center gap-2.5 transition-colors hover:text-brand">
                <Phone className="h-4 w-4 shrink-0" /> +91 73496 03429
              </a>
            </li>
            <li>
              <a
                href="mailto:support@myprimecompany.in"
                className="flex items-center gap-2.5 transition-colors hover:text-brand"
              >
                <Mail className="h-4 w-4 shrink-0" /> support@myprimecompany.in
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-ink-foreground/70">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                HSR Layout Sector 4, 17th Main B Cross,
                <br />
                Bangalore, Karnataka 560102
              </span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary'

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label-mono mb-1.5 block text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

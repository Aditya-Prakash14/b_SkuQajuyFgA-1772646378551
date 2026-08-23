'use client'

import { useMemo, useState } from 'react'
import { Check, Loader2, MessageCircle, Phone } from 'lucide-react'
import { formatINR } from '@prime/shared'
import {
  GUARANTEES,
  SLOTS,
  TASKS,
  TASK_LABEL,
  WHATSAPP_NUMBER,
  submitPrimeNowRequest,
  whatsappHref,
  whatsappMessage,
  type PrimeNowInput,
  type SlotId,
} from '@/lib/prime-now'

/**
 * Three steps in one card, with a sticky summary that prices the request live.
 * No catalogue and no cart: this is a request, dispatched to a helper.
 */
export function PrimeNowRequestFlow({ cities }: { cities: string[] }) {
  const [slotId, setSlotId] = useState<SlotId>('1h')
  const [tasks, setTasks] = useState<string[]>([])
  const [detail, setDetail] = useState('')
  const [timing, setTiming] = useState<'now' | 'scheduled'>('now')
  const [scheduledFor, setScheduledFor] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(cities[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ number: string; href: string } | null>(null)

  const slot = useMemo(() => SLOTS.find((s) => s.id === slotId)!, [slotId])
  const toggleTask = (id: string) =>
    setTasks((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  const arrival =
    timing === 'now'
      ? 'Within the hour'
      : scheduledFor
        ? new Date(scheduledFor).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Pick a date and time'

  async function send() {
    setError(null)
    if (!name.trim()) return setError('Please tell us your name.')
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid 10-digit phone number.')
    if (!address.trim()) return setError('Please enter the address where the helper should come.')
    if (timing === 'scheduled' && !scheduledFor) return setError('Pick the date and time you want the helper.')

    const input: PrimeNowInput = {
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      address: address.trim(),
      city: city || null,
      slot: slotId,
      tasks,
      notes: detail.trim() || null,
      timing,
      scheduledFor: timing === 'scheduled' ? new Date(scheduledFor).toISOString() : null,
    }

    setBusy(true)
    try {
      const res = await submitPrimeNowRequest(input)
      const href = whatsappHref(whatsappMessage(input, res.request_number, slot))
      setDone({ number: res.request_number, href })
      // The request is already saved; WhatsApp is the follow-up, not the record.
      window.open(href, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not send the request. Please call us instead.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-panel">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
          <Check className="h-7 w-7" />
        </div>
        <p className="label-mono text-muted-foreground">Request {done.number}</p>
        <h2 className="mt-3 text-2xl font-extrabold">We have your request</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Our team is finding a helper near you. We will call you on{' '}
          <span className="font-semibold text-foreground">{phone}</span> to confirm.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={done.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> Open WhatsApp
          </a>
          <a
            href={`tel:+${WHATSAPP_NUMBER}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-3 font-semibold transition-colors hover:border-primary hover:text-primary"
          >
            <Phone className="h-4 w-4" /> Call us
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      {/* ── The three steps ─────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <Step n={1} title="How long do you need help for?" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SLOTS.map((s) => {
            const active = s.id === slotId
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlotId(s.id)}
                aria-pressed={active}
                className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                  active ? 'border-primary bg-secondary' : 'border-border hover:border-primary/40'
                }`}
              >
                <span>
                  <span className="block font-bold">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.sublabel}</span>
                </span>
                <span className="tabular text-lg font-extrabold">{formatINR(s.price)}</span>
              </button>
            )
          })}
        </div>

        <hr className="my-8 border-border" />

        <Step n={2} title="What should they do?" hint="Pick as many as you like." />
        <div className="mt-4 flex flex-wrap gap-2">
          {TASKS.map((t) => {
            const active = tasks.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTask(t.id)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <label className="mt-4 block">
          <span className="sr-only">Anything else we should know</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            placeholder="Anything else? e.g. two bedrooms and a balcony, pets at home, please bring a mop."
            className="w-full rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:border-primary"
          />
        </label>

        <hr className="my-8 border-border" />

        <Step n={3} title="When and where?" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              { id: 'now', label: 'Right now', sub: 'Within the hour' },
              { id: 'scheduled', label: 'Schedule for later', sub: 'Pick a date and time' },
            ] as const
          ).map((opt) => {
            const active = timing === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTiming(opt.id)}
                aria-pressed={active}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  active ? 'border-primary bg-secondary' : 'border-border hover:border-primary/40'
                }`}
              >
                <span className="block font-bold">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.sub}</span>
              </button>
            )
          })}
        </div>

        {timing === 'scheduled' && (
          <Field label="Date and time" className="mt-4">
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </Field>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </Field>
          <Field label="Phone number">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit mobile"
              className="tabular w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Flat / house, street, landmark"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </Field>
          {cities.length > 0 && (
            <Field label="City" className="sm:col-span-2">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </div>

      {/* ── Sticky summary ──────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-28">
        <div className="rounded-3xl bg-ink p-6 text-ink-foreground shadow-panel">
          <p className="label-mono text-brand">Your request</p>
          <dl className="mt-5 space-y-3 text-sm">
            <Row label="Slot" value={slot.label} />
            <Row
              label="Tasks"
              value={tasks.length ? `${tasks.length} selected` : 'Not chosen yet'}
            />
            <Row label="Arrival" value={arrival} />
          </dl>

          {tasks.length > 0 && (
            <p className="mt-3 text-xs leading-relaxed text-ink-foreground/60">
              {tasks.map((t) => TASK_LABEL[t] ?? t).join(' · ')}
            </p>
          )}

          <div className="mt-5 flex items-baseline justify-between border-t border-white/15 pt-5">
            <span className="font-semibold">Total</span>
            <span className="tabular text-3xl font-extrabold">{formatINR(slot.price)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-foreground/60">
            Flat price for the slot. No travel charge.
          </p>

          {error && (
            <p className="mt-4 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-white">{error}</p>
          )}

          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 font-bold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            {busy ? 'Sending…' : 'Send request'}
          </button>
          <a
            href={`tel:+${WHATSAPP_NUMBER}`}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
          >
            <Phone className="h-4 w-4" /> Or call +91 73496 03429
          </a>
        </div>

        <ul className="mt-4 space-y-2">
          {GUARANTEES.map((g) => (
            <li key={g.title} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">{g.title}</span>
                <span className="block text-xs text-muted-foreground">{g.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

function Step({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="label-mono text-primary">Step {n}</span>
      <span>
        <span className="block text-lg font-extrabold">{title}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
    </div>
  )
}

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-foreground/60">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

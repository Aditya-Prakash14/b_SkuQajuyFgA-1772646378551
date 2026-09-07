'use client'

import { useEffect, useState } from 'react'
import {
  Minus, Plus, Trash2, ShoppingBag, Phone, MapPin,
  Calendar, Clock, User, CheckCircle, ArrowLeft, Tag, ShieldCheck, Loader2,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useCity } from '@/lib/city-context'
import { createClient } from '@/lib/supabase/client'
import { GoogleMark } from '@/components/site-header'
import { TIME_SLOTS } from '@/lib/slots'
import type { Address } from '@prime/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

type Step = 'cart' | 'checkout' | 'success'

/** Radix Select reserves "", so the optional "any slot" choice needs a sentinel. */
const ANY_SLOT = '__any__'

interface BookingForm {
  name: string
  phone: string
  city: string
  date: string
  slot: string
  address: string
}

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, totalItems, totalPrice } = useCart()
  const { user, displayName, signInWithGoogle, loading: authLoading } = useAuth()
  const { city: detectedCity, cities } = useCity()

  const [step, setStep] = useState<Step>('cart')
  const [form, setForm] = useState<BookingForm>({ name: '', phone: '', city: '', date: '', slot: '', address: '' })
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [errors, setErrors] = useState<Partial<BookingForm>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState('')

  // Returning from Google OAuth. Success → reopen the cart straight at checkout.
  // Failure → reopen it on the sign-in step showing why, rather than dropping
  // the user on the home page with a raw ?error=... in the address bar.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)

    const signedIn = params.get('signed_in') === '1'
    const failed = params.get('auth_error')
    if (!signedIn && !failed) return

    setCartOpen(true)
    if (signedIn) setStep('checkout')
    if (failed) setAuthError(failed)

    params.delete('signed_in')
    params.delete('auth_error')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [setCartOpen])

  // Prefill from the Google profile and the detected city.
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || displayName }))
  }, [user, displayName])
  useEffect(() => {
    if (detectedCity) setForm((f) => ({ ...f, city: f.city || detectedCity }))
  }, [detectedCity])

  // Load saved addresses to speed up checkout; prefill the default one.
  useEffect(() => {
    if (!user) { setSavedAddresses([]); return }
    createClient()
      .from('addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        const list = (data as Address[]) ?? []
        setSavedAddresses(list)
        const def = list.find((a) => a.is_default) ?? list[0]
        if (def) setForm((f) => ({ ...f, address: f.address || def.full_address, city: f.city || def.city }))
      })
  }, [user])

  const close = () => {
    setCartOpen(false)
    setTimeout(() => {
      setStep('cart')
      setErrors({})
      setApiError(null)
    }, 300)
  }

  const validate = () => {
    const e: Partial<BookingForm> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number'
    if (!form.city) e.city = 'Please select a city'
    if (!form.date) e.date = 'Please pick a date'
    if (!form.address.trim()) e.address = 'Address is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setApiError('Please sign in to place your booking.')
      return
    }
    if (!validate()) return

    setSubmitting(true)
    setApiError(null)
    try {
      // Authenticated browser client → create_booking() links the order to your
      // account and re-prices every line from the live catalogue.
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_booking', {
        p_name: form.name,
        p_phone: form.phone,
        // The SQL does nullif(trim(...), '') — '' is treated as NULL server-side.
        p_email: user.email ?? '',
        p_city: form.city,
        p_address: form.address,
        p_scheduled_date: form.date,
        p_slot: form.slot || undefined,
        p_items: cart.map((c) => ({ service_id: c.id, qty: c.qty, units: c.units ?? 1 })),
      })
      if (error) throw error
      const result = data as { order_id: string; order_number: string } | null
      setOrderNumber(result?.order_number ?? '')
      setStep('success')
      clearCart()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again or call us.')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (key: keyof BookingForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <Sheet open={cartOpen} onOpenChange={(open) => { if (!open) close() }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-105">
        {/* Header */}
        <SheetHeader className="flex-row items-center gap-2 space-y-0 border-b px-5 py-4">
          {step === 'checkout' && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setStep('cart')}
              aria-label="Back to cart"
              className="-ml-2 text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="size-5" />
            </Button>
          )}
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">M</span>
          <SheetTitle className="text-base font-black">
            {step === 'cart' ? `My Cart (${totalItems})` : step === 'checkout' ? 'Book Service' : 'Booking Confirmed'}
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1 — Cart */}
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
                    <ShoppingBag className="size-9 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">Your cart is empty</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add services to get started</p>
                  </div>
                  <Button onClick={close} className="rounded-xl font-semibold">
                    Browse Services
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-2xl border bg-muted/40 p-3">
                      <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                        <img src={item.img} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{item.name}</p>
                        <p className="mt-1 text-sm font-bold text-primary">{item.priceStr}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            aria-label="Decrease quantity"
                            className="rounded-lg hover:border-primary hover:text-primary"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            aria-label="Increase quantity"
                            className="rounded-lg hover:border-primary hover:text-primary"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="mt-0.5 shrink-0 self-start text-muted-foreground/60 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/10 px-3 py-2.5">
                    <Tag className="size-4 shrink-0 text-brand" />
                    <p className="text-xs font-semibold text-brand">Free re-service warranty on every booking</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2 — Checkout (auth-gated) */}
          {step === 'checkout' && (
            <>
              {authLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : !user ? (
                /* ── Google sign-in gate ── */
                <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <ShieldCheck className="size-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-foreground">Sign in to continue</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      We ask you to sign in so your booking is securely linked to you and you can track it later.
                      It takes one tap.
                    </p>
                  </div>

                  {authError && (
                    <Alert variant="destructive" className="text-left">
                      <AlertTitle>Sign-in failed</AlertTitle>
                      <AlertDescription className="text-xs leading-relaxed">{authError}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setAuthError(null)
                      signInWithGoogle(typeof window !== 'undefined' ? window.location.pathname : '/')
                    }}
                    className="w-full gap-3 rounded-xl border-2 font-bold"
                  >
                    <GoogleMark className="size-5" /> {authError ? 'Try again with Google' : 'Continue with Google'}
                  </Button>

                  <div className="w-full rounded-xl border bg-muted/40 p-3 text-left">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your order</p>
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between py-0.5 text-xs text-muted-foreground">
                        <span className="mr-2 truncate">{item.name} × {item.qty}</span>
                        <span className="whitespace-nowrap font-semibold">₹{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t pt-2 text-sm font-bold text-primary">
                      <span>Total</span>
                      <span>₹{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground/70">We never post anything to your Google account.</p>
                </div>
              ) : (
                /* ── Booking form ── */
                <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4 p-4" noValidate>
                  <div className="flex items-center gap-2 rounded-xl border bg-secondary px-3 py-2">
                    <CheckCircle className="size-4 shrink-0 text-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Signed in as <strong>{user.email}</strong>
                    </p>
                  </div>

                  {apiError && (
                    <Alert variant="destructive">
                      <AlertDescription>{apiError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Order Summary</p>
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between py-0.5 text-xs text-muted-foreground">
                        <span className="mr-2 truncate">{item.name} × {item.qty}</span>
                        <span className="whitespace-nowrap font-semibold">₹{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t border-primary/10 pt-2 text-sm font-bold text-primary">
                      <span>Total</span>
                      <span>₹{totalPrice.toLocaleString()}</span>
                    </div>
                    <p className="mt-0.5 text-right text-[11px] text-muted-foreground/70">Inclusive of 18% GST</p>
                  </div>

                  <Field id="co-name" label="Full Name" icon={User} error={errors.name}>
                    <Input
                      id="co-name"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={(e) => field('name', e.target.value)}
                      aria-invalid={!!errors.name}
                    />
                  </Field>

                  <Field id="co-phone" label="Mobile Number" icon={Phone} error={errors.phone}>
                    <Input
                      id="co-phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => field('phone', e.target.value.replace(/\D/g, ''))}
                      aria-invalid={!!errors.phone}
                    />
                  </Field>

                  <Field id="co-city" label="City" icon={MapPin} error={errors.city}>
                    <Select value={form.city || undefined} onValueChange={(v) => field('city', v)}>
                      <SelectTrigger id="co-city" className="w-full" aria-invalid={!!errors.city}>
                        <SelectValue placeholder="Select your city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field id="co-date" label="Preferred Date" icon={Calendar} error={errors.date}>
                    <Input
                      id="co-date"
                      type="date"
                      min={minDateStr}
                      value={form.date}
                      onChange={(e) => field('date', e.target.value)}
                      aria-invalid={!!errors.date}
                    />
                  </Field>

                  <Field id="co-slot" label="Preferred Time Slot" icon={Clock}>
                    <Select
                      value={form.slot || ANY_SLOT}
                      onValueChange={(v) => field('slot', v === ANY_SLOT ? '' : v)}
                    >
                      <SelectTrigger id="co-slot" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_SLOT}>Any time — we&apos;ll confirm on call</SelectItem>
                        {TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>

                  {savedAddresses.length > 0 && (
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Saved addresses</Label>
                      <Select
                        onValueChange={(id) => {
                          const a = savedAddresses.find((x) => x.id === id)
                          if (a) setForm((f) => ({ ...f, address: a.full_address, city: a.city }))
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Use a saved address…" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedAddresses.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.label ? `${a.label} — ` : ''}{a.full_address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Field id="co-address" label="Full Address" icon={MapPin} error={errors.address}>
                    <Textarea
                      id="co-address"
                      rows={3}
                      placeholder="Flat / House No., Street, Area"
                      value={form.address}
                      onChange={(e) => field('address', e.target.value)}
                      aria-invalid={!!errors.address}
                      className="resize-none"
                    />
                  </Field>
                </form>
              )}
            </>
          )}

          {/* STEP 3 — Success */}
          {step === 'success' && (
            <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
              <div className="flex size-24 items-center justify-center rounded-full bg-secondary">
                <CheckCircle className="size-12 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">Booking Confirmed!</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Thank you, <strong>{form.name}</strong>! We have received your booking for{' '}
                  <strong>{form.date}</strong> in <strong>{form.city}</strong>.
                </p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  Our team will call you at <strong>{form.phone}</strong> to confirm the slot.
                </p>
              </div>

              <div className="w-full space-y-1.5 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-left">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Booking Details</p>
                {orderNumber && (
                  <Row label="Order #" value={orderNumber} />
                )}
                <Row label="Name" value={form.name} />
                <Row label="City" value={form.city} />
                <Row label="Date" value={form.date} />
                {form.slot && <Row label="Time" value={form.slot} />}
              </div>

              <Button asChild className="rounded-xl font-bold">
                <a href="tel:+917349603429">
                  <Phone /> Call Us for Updates
                </a>
              </Button>
              <Button variant="ghost" onClick={close} className="text-muted-foreground">
                Close
              </Button>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {cart.length > 0 && step !== 'success' && (
          <div className="border-t bg-background p-4">
            {step === 'cart' && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{totalItems} service{totalItems !== 1 ? 's' : ''}</span>
                  <span className="text-xl font-black text-primary">₹{totalPrice.toLocaleString()}</span>
                </div>
                <Button
                  variant="brand"
                  size="lg"
                  onClick={() => setStep('checkout')}
                  className="w-full rounded-xl font-bold shadow-md shadow-brand/30"
                >
                  Proceed to Book
                </Button>
              </>
            )}
            {step === 'checkout' && user && (
              <Button
                type="submit"
                form="checkout-form"
                variant="brand"
                size="lg"
                disabled={submitting}
                className="w-full rounded-xl font-bold shadow-md shadow-brand/30"
              >
                {submitting ? (
                  <><Loader2 className="animate-spin" /> Confirming Booking…</>
                ) : (
                  `Confirm Booking • ₹${totalPrice.toLocaleString()}`
                )}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Field({
  id, label, icon: Icon, error, children,
}: {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import {
  X, Minus, Plus, Trash2, ShoppingBag, Phone, MapPin,
  Calendar, User, CheckCircle, ArrowLeft, Tag, ShieldCheck, Loader2,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useCity } from '@/lib/city-context'
import { createClient } from '@/lib/supabase/client'
import { GoogleMark } from '@/components/site-header'

type Step = 'cart' | 'checkout' | 'success'

interface BookingForm {
  name: string
  phone: string
  city: string
  date: string
  address: string
}

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, totalItems, totalPrice } = useCart()
  const { user, displayName, signInWithGoogle, loading: authLoading } = useAuth()
  const { city: detectedCity, cities } = useCity()

  const [step, setStep] = useState<Step>('cart')
  const [form, setForm] = useState<BookingForm>({ name: '', phone: '', city: '', date: '', address: '' })
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
        p_items: cart.map((c) => ({ service_id: c.id, qty: c.qty })),
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

  if (!cartOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={close} />

      <div className="fixed top-0 right-0 h-full w-full sm:w-105 bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            {step === 'checkout' && (
              <button onClick={() => setStep('cart')} className="text-gray-400 hover:text-primary mr-1 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <img src="/prime%20Home%20cleaning.svg" alt="MyPrimeCompany" className="h-9 w-auto" />
            <h2 className="font-black text-gray-800 text-base">
              {step === 'cart' ? `My Cart (${totalItems})` : step === 'checkout' ? 'Book Service' : 'Booking Confirmed'}
            </h2>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1 — Cart */}
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-9 h-9 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">Your cart is empty</p>
                    <p className="text-gray-500 text-sm mt-1">Add services to get started</p>
                  </div>
                  <button onClick={close} className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
                    Browse Services
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                        <p className="text-primary font-bold text-sm mt-1">{item.priceStr}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-sm w-5 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 self-start mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-xl px-3 py-2.5 mt-2">
                    <Tag className="w-4 h-4 text-accent shrink-0" />
                    <p className="text-xs text-accent font-semibold">Free re-service warranty on every booking</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2 — Checkout (auth-gated) */}
          {step === 'checkout' && (
            <>
              {authLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !user ? (
                /* ── Google sign-in gate ── */
                <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-gray-800 text-lg">Sign in to continue</p>
                    <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                      We ask you to sign in so your booking is securely linked to you and you can track it later.
                      It takes one tap.
                    </p>
                  </div>

                  {authError && (
                    <div className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-600">
                      <p className="font-semibold">Sign-in failed</p>
                      <p className="mt-0.5 text-xs leading-relaxed">{authError}</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setAuthError(null)
                      signInWithGoogle(typeof window !== 'undefined' ? window.location.pathname : '/')
                    }}
                    className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 bg-white text-gray-700 font-bold py-3.5 rounded-xl hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <GoogleMark className="w-5 h-5" /> {authError ? 'Try again with Google' : 'Continue with Google'}
                  </button>

                  <div className="bg-gray-50 rounded-xl p-3 w-full text-left border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your order</p>
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                        <span className="truncate mr-2">{item.name} × {item.qty}</span>
                        <span className="font-semibold whitespace-nowrap">₹{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm font-bold text-primary">
                      <span>Total</span>
                      <span>₹{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400">We never post anything to your Google account.</p>
                </div>
              ) : (
                /* ── Booking form ── */
                <form id="checkout-form" onSubmit={handleSubmit} className="p-4 space-y-4" noValidate>
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-700">
                      Signed in as <strong>{user.email}</strong>
                    </p>
                  </div>

                  {apiError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{apiError}</div>
                  )}

                  <div className="bg-primary/5 rounded-2xl p-3 border border-primary/10">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Order Summary</p>
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                        <span className="truncate mr-2">{item.name} × {item.qty}</span>
                        <span className="font-semibold whitespace-nowrap">₹{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-primary/10 mt-2 pt-2 flex justify-between text-sm font-bold text-primary">
                      <span>Total</span>
                      <span>₹{totalPrice.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 text-right mt-0.5">Inclusive of 18% GST</p>
                  </div>

                  <Field label="Full Name" icon={User} error={errors.name}>
                    <input type="text" placeholder="Your full name" value={form.name} onChange={(e) => field('name', e.target.value)} className={inputCls(errors.name)} />
                  </Field>

                  <Field label="Mobile Number" icon={Phone} error={errors.phone}>
                    <input type="tel" placeholder="10-digit mobile number" maxLength={10} value={form.phone}
                      onChange={(e) => field('phone', e.target.value.replace(/\D/g, ''))} className={inputCls(errors.phone)} />
                  </Field>

                  <Field label="City" icon={MapPin} error={errors.city}>
                    <select value={form.city} onChange={(e) => field('city', e.target.value)} className={inputCls(errors.city)}>
                      <option value="">Select your city</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Preferred Date" icon={Calendar} error={errors.date}>
                    <input type="date" min={minDateStr} value={form.date} onChange={(e) => field('date', e.target.value)} className={inputCls(errors.date)} />
                  </Field>

                  <Field label="Full Address" icon={MapPin} error={errors.address}>
                    <textarea rows={3} placeholder="Flat / House No., Street, Area" value={form.address}
                      onChange={(e) => field('address', e.target.value)} className={`${inputCls(errors.address)} resize-none`} />
                  </Field>
                </form>
              )}
            </>
          )}

          {/* STEP 3 — Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center py-10">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div>
                <p className="font-black text-gray-800 text-2xl">Booking Confirmed!</p>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  Thank you, <strong>{form.name}</strong>! We have received your booking for{' '}
                  <strong>{form.date}</strong> in <strong>{form.city}</strong>.
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Our team will call you at <strong>{form.phone}</strong> to confirm the slot.
                </p>
              </div>

              <div className="bg-primary/5 rounded-2xl p-4 w-full text-left border border-primary/10 space-y-1.5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Booking Details</p>
                {orderNumber && (
                  <Row label="Order #" value={orderNumber} />
                )}
                <Row label="Name" value={form.name} />
                <Row label="City" value={form.city} />
                <Row label="Date" value={form.date} />
              </div>

              <a href="tel:+917349603429" className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                <Phone className="w-4 h-4" /> Call Us for Updates
              </a>
              <button onClick={close} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Close</button>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {cart.length > 0 && step !== 'success' && (
          <div className="border-t border-gray-100 bg-white p-4">
            {step === 'cart' && (
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500">{totalItems} service{totalItems !== 1 ? 's' : ''}</span>
                  <span className="font-black text-primary text-xl">₹{totalPrice.toLocaleString()}</span>
                </div>
                <button onClick={() => setStep('checkout')} className="w-full bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-colors text-sm shadow-md shadow-accent/30">
                  Proceed to Book
                </button>
              </>
            )}
            {step === 'checkout' && user && (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-colors text-sm shadow-md shadow-accent/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirming Booking…</>
                ) : (
                  `Confirm Booking • ₹${totalPrice.toLocaleString()}`
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function inputCls(error?: string) {
  return `w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors bg-white ${
    error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary'
  }`
}

function Field({
  label, icon: Icon, error, children,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-700">{value}</span>
    </div>
  )
}

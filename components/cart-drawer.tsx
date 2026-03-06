'use client'

import { useState } from 'react'
import {
  X, Minus, Plus, Trash2, ShoppingBag, Phone, MapPin,
  Calendar, User, CheckCircle, ArrowLeft, Tag,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'cart' | 'checkout' | 'success'

interface BookingForm {
  name: string
  phone: string
  city: string
  date: string
  address: string
}

const CITIES = [
  'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai',
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Bhubaneswar', 'Gurgaon', 'Noida',
]

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, totalItems, totalPrice } = useCart()
  const [step, setStep] = useState<Step>('cart')
  const [form, setForm] = useState<BookingForm>({ name: '', phone: '', city: '', date: '', address: '' })
  const [errors, setErrors] = useState<Partial<BookingForm>>({})
  const [submitting, setSubmitting] = useState(false)

  const close = () => {
    setCartOpen(false)
    // Reset to cart view after drawer closes
    setTimeout(() => { setStep('cart'); setErrors({}) }, 300)
  }

  // ── Validation ──
  const validate = () => {
    const e: Partial<BookingForm> = {}
    if (!form.name.trim())    e.name    = 'Name is required'
    if (!form.phone.trim() || !/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number'
    if (!form.city)           e.city    = 'Please select a city'
    if (!form.date)           e.date    = 'Please pick a date'
    if (!form.address.trim()) e.address = 'Address is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    // Simulate API call
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    setStep('success')
    clearCart()
  }

  const field = (key: keyof BookingForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  // ── Tomorrow's date as min ──
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  if (!cartOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-105 bg-white z-50 shadow-2xl flex flex-col">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            {step === 'checkout' && (
              <button onClick={() => setStep('cart')} className="text-gray-400 hover:text-primary mr-1 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <img src="/prime%20Home%20cleaning.svg" alt="Prime Home Care Logo" className="h-9 w-auto" />
            <h2 className="font-black text-gray-800 text-base">
              {step === 'cart' ? `My Cart (${totalItems})` : step === 'checkout' ? 'Book Service' : 'Booking Confirmed'}
            </h2>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══════════ STEP 1: Cart ═══════════ */}
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
                  <button
                    onClick={close}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    Browse Services
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                        <p className="text-primary font-bold text-sm mt-1">{item.priceStr}</p>

                        {/* Qty controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-sm w-5 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0 self-start mt-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Promo banner */}
                  <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-xl px-3 py-2.5 mt-2">
                    <Tag className="w-4 h-4 text-accent shrink-0" />
                    <p className="text-xs text-accent font-semibold">Free re-service warranty on every booking</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════════ STEP 2: Checkout Form ═══════════ */}
          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handleSubmit} className="p-4 space-y-4" noValidate>

              {/* Order summary mini */}
              <div className="bg-primary/5 rounded-2xl p-3 border border-primary/10">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Order Summary</p>
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                    <span className="truncate mr-2">{item.name} × {item.qty}</span>
                    <span className="font-semibold whitespace-nowrap">₹{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-primary/10 mt-2 pt-2 flex justify-between text-sm font-bold text-primary">
                  <span>Total</span>
                  <span>₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => field('name', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5" /> Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={form.phone}
                  onChange={e => field('phone', e.target.value.replace(/\D/g, ''))}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              {/* City */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5" /> City
                </label>
                <select
                  value={form.city}
                  onChange={e => field('city', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none bg-white transition-colors ${errors.city ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
                >
                  <option value="">Select your city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Preferred Date
                </label>
                <input
                  type="date"
                  min={minDateStr}
                  value={form.date}
                  onChange={e => field('date', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${errors.date ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Full Address
                </label>
                <textarea
                  rows={3}
                  placeholder="Flat / House No., Street, Area"
                  value={form.address}
                  onChange={e => field('address', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors resize-none ${errors.address ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

            </form>
          )}

          {/* ═══════════ STEP 3: Success ═══════════ */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center py-10">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div>
                <p className="font-black text-gray-800 text-2xl">Booking Confirmed!</p>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  Thank you, <strong>{form.name}</strong>! We've received your booking for <strong>{form.date}</strong> in <strong>{form.city}</strong>.
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Our team will call you at <strong>{form.phone}</strong> to confirm the slot.
                </p>
              </div>
              <div className="bg-primary/5 rounded-2xl p-4 w-full text-left border border-primary/10 space-y-1.5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Booking Details</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-semibold text-gray-700">{form.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">City</span>
                  <span className="font-semibold text-gray-700">{form.city}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold text-gray-700">{form.date}</span>
                </div>
              </div>
              <a
                href="tel:+919880778585"
                className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call Us for Updates
              </a>
              <button onClick={close} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Close
              </button>
            </div>
          )}

        </div>

        {/* ── Footer CTA ─────────────────────────────────── */}
        {cart.length > 0 && step !== 'success' && (
          <div className="border-t border-gray-100 bg-white p-4">
            {step === 'cart' && (
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500">{totalItems} service{totalItems !== 1 ? 's' : ''}</span>
                  <span className="font-black text-primary text-xl">₹{totalPrice.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setStep('checkout')}
                  className="w-full bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-colors text-sm shadow-md shadow-accent/30"
                >
                  Proceed to Book
                </button>
              </>
            )}
            {step === 'checkout' && (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-colors text-sm shadow-md shadow-accent/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Confirming Booking…
                  </>
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

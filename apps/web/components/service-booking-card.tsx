'use client'

import { useState } from 'react'
import { Check, Clock, LocateFixed, Loader2, MapPin, MessageCircle, Phone, ShoppingBag, Tag } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCity } from '@/lib/city-context'

interface Props {
  id: string
  name: string
  img: string
  price: number
  priceStr: string
  duration: string
  category: string
}

/**
 * The sticky booking panel on a service page: what it costs, how long it takes,
 * which category it belongs to, where we cover — then the three ways to book.
 */
export default function ServiceBookingCard({
  id,
  name,
  img,
  price,
  priceStr,
  duration,
  category,
}: Props) {
  const { addToCart, cart, setCartOpen } = useCart()
  const { city, setCity, cities, detectCity, detecting } = useCity()
  const inCart = cart.some((c) => c.id === id)
  const [added, setAdded] = useState(false)

  const [amount, unit] = priceStr.split(' / ')

  const whatsapp = `https://wa.me/917349603429?text=${encodeURIComponent(
    `Hi, I would like to book: ${name} (${priceStr})${city ? ` in ${city}` : ''}.`,
  )}`

  function handleAdd() {
    addToCart({ id, name, img, price, priceStr })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-panel">
      <div className="border-b border-border p-6">
        <p className="label-mono text-muted-foreground">Starting from</p>
        <p className="mt-1">
          <span className="tabular text-4xl font-extrabold">{amount}</span>
          {unit && <span className="ml-1.5 text-sm text-muted-foreground">/ {unit}</span>}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>
      </div>

      <dl className="divide-y divide-border border-b border-border text-sm">
        <Row icon={<Clock className="h-4 w-4" />} label="Duration" value={duration || 'Depends on area'} />
        <Row icon={<Tag className="h-4 w-4" />} label="Category" value={category} />
        <div className="flex items-center justify-between gap-3 px-6 py-3.5">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" /> Coverage
          </dt>
          <dd className="flex items-center gap-2">
            <select
              value={city ?? ''}
              onChange={(e) => setCity(e.target.value)}
              className="max-w-32 bg-transparent text-right font-medium outline-none"
              aria-label="Select your city"
            >
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={detectCity}
              disabled={detecting}
              className="text-primary disabled:opacity-50"
              aria-label="Detect my city"
            >
              {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            </button>
          </dd>
        </div>
      </dl>

      <div className="space-y-2.5 p-6">
        <button
          type="button"
          onClick={handleAdd}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold transition-opacity hover:opacity-90 ${
            added || inCart
              ? 'bg-primary text-primary-foreground'
              : 'bg-brand text-brand-foreground'
          }`}
        >
          {added || inCart ? (
            <>
              <Check className="h-4 w-4" /> Added to cart
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </>
          )}
        </button>

        {inCart && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="w-full rounded-2xl border border-primary px-5 py-3 font-semibold text-primary transition-colors hover:bg-secondary"
          >
            View cart &amp; book
          </button>
        )}

        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 font-semibold transition-colors hover:border-primary hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp us
        </a>
        <a
          href="tel:+917349603429"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 font-semibold transition-colors hover:border-primary hover:text-primary"
        >
          <Phone className="h-4 w-4" /> Call to book
        </a>
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3.5">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

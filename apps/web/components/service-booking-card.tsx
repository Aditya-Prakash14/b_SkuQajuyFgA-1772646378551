'use client'

import { useState } from 'react'
import { Phone, MapPin, Calendar, ShoppingBag, CheckCircle, LocateFixed, Loader2 } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCity } from '@/lib/city-context'

interface Props {
  id: string
  name: string
  img: string
  price: number
  priceStr: string
}

export default function ServiceBookingCard({ id, name, img, price, priceStr }: Props) {
  const { addToCart, cart, setCartOpen } = useCart()
  const { city, setCity, cities, detectCity, detecting } = useCity()
  const inCart = cart.some((c) => c.id === id)
  const [added, setAdded] = useState(false)

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  const handleAdd = () => {
    addToCart({ id, name, img, price, priceStr })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-primary p-5 text-white">
        <p className="text-sm opacity-80 mb-1">Starting from</p>
        <p className="text-4xl font-black">{priceStr}</p>
        <p className="text-sm opacity-70 mt-1">Inclusive of all taxes</p>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select City</label>
            <button
              type="button"
              onClick={detectCity}
              disabled={detecting}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-60"
            >
              {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
              {detecting ? 'Detecting…' : 'Detect'}
            </button>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <select
              value={city ?? ''}
              onChange={(e) => setCity(e.target.value)}
              className="flex-1 text-sm text-gray-700 outline-none bg-transparent"
            >
              <option value="">Choose your city</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Preferred Date
          </label>
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <input type="date" min={minDateStr} className="flex-1 text-sm text-gray-700 outline-none bg-transparent" />
          </div>
        </div>

        <button
          onClick={handleAdd}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
            added || inCart
              ? 'bg-green-500 text-white shadow-green-500/30'
              : 'bg-accent text-white hover:bg-accent/90 shadow-accent/30'
          }`}
        >
          {added || inCart ? (
            <><CheckCircle className="w-4 h-4" /> Added to Cart</>
          ) : (
            <><ShoppingBag className="w-4 h-4" /> Add to Cart</>
          )}
        </button>

        {inCart && (
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-2.5 rounded-xl border-2 border-accent text-accent font-bold text-sm hover:bg-accent/5 transition-colors"
          >
            View Cart &amp; Book
          </button>
        )}

        <a
          href="tel:+917349603429"
          className="block w-full border-2 border-primary text-primary text-center font-bold py-3 rounded-xl hover:bg-primary/5 transition-colors text-sm"
        >
          <Phone className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Call to Book
        </a>
      </div>
    </div>
  )
}

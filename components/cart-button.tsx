'use client'

import { ShoppingCart, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart-context'

export default function CartButton() {
  const { totalItems, setCartOpen } = useCart()

  return (
    <button
      onClick={() => setCartOpen(true)}
      className="relative flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-accent/90 transition-colors shadow-md shadow-accent/30"
    >
      {totalItems > 0 ? (
        <>
          <ShoppingBag className="w-4 h-4" />
          Cart
          <span className="bg-white text-accent text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center leading-none">
            {totalItems > 9 ? '9+' : totalItems}
          </span>
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" /> Book Now
        </>
      )}
    </button>
  )
}

'use client'

import { Plus } from 'lucide-react'
import { useCart, type CartItem } from '@/lib/cart-context'

/** Small client island so category/service pages can stay server-rendered. */
export function AddToCartButton({
  item,
  label = 'Add',
  full = false,
}: {
  item: Omit<CartItem, 'qty'>
  label?: string
  full?: boolean
}) {
  const { addToCart } = useCart()
  return (
    <button
      type="button"
      onClick={() => addToCart(item)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 ${
        full ? 'w-full py-3.5 text-base' : ''
      }`}
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  )
}

'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string          // unique key (slug or name-slug)
  name: string
  img: string
  price: number       // numeric for total calculation
  priceStr: string    // display string e.g. ₹1,499
  qty: number
}

interface CartContextValue {
  cart: CartItem[]
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  addToCart: (item: Omit<CartItem, 'qty'>) => void
  removeFromCart: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

// ─── Context ─────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('primehomecare_cart')
      if (stored) setCart(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('primehomecare_cart', JSON.stringify(cart))
    }
  }, [cart, hydrated])

  const addToCart = useCallback((item: Omit<CartItem, 'qty'>) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { ...item, qty: 1 }]
    })
    setCartOpen(true)
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(c => c.id !== id))
  }, [])

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty < 1) {
      setCart(prev => prev.filter(c => c.id !== id))
    } else {
      setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c))
    }
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0)
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0)

  return (
    <CartContext.Provider value={{
      cart, cartOpen, setCartOpen,
      addToCart, removeFromCart, updateQty, clearCart,
      totalItems, totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}

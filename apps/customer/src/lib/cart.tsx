import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { track } from './analytics'
import { VISIT_CHARGE } from './bookings'
import type { CartLine, Service } from './types'

/**
 * The Deep Cleaning cart. Prime Now never uses it — that flow is a single
 * request, not a basket, which is why the cart badge only ever reflects
 * scheduled work.
 *
 * Every amount here is an estimate for display. create_booking re-prices each
 * line server-side at checkout, so the bill the customer finally pays comes
 * from the catalogue, not from this state.
 */

const STORAGE_KEY = 'mpc_customer_cart_v1'

interface CartValue {
  lines: CartLine[]
  add: (service: Service, units?: number) => void
  addLines: (lines: CartLine[]) => void
  remove: (serviceId: string) => void
  setQty: (serviceId: string, qty: number) => void
  setUnits: (serviceId: string, units: number) => void
  clear: () => void
  count: number
  subtotal: number
  visitCharge: number
  total: number
  hydrated: boolean
}

const CartContext = createContext<CartValue | null>(null)

const lineTotal = (l: CartLine) => l.rate * l.units * l.qty

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setLines(JSON.parse(raw) as CartLine[])
      })
      .catch(() => {})
      .finally(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines)).catch(() => {})
  }, [lines, hydrated])

  const add = useCallback((service: Service, units = 1) => {
    track('add_to_cart', { service: service.slug, per_unit: service.priceUnit !== 'fixed' })
    setLines((prev) => {
      const existing = prev.find((l) => l.serviceId === service.id)
      if (existing) {
        // For a per-unit service the customer is restating the area, not
        // ordering a second one — replace units instead of bumping quantity.
        return prev.map((l) =>
          l.serviceId === service.id
            ? service.priceUnit === 'fixed'
              ? { ...l, qty: l.qty + 1 }
              : { ...l, units }
            : l,
        )
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          name: service.name,
          image: service.image,
          rate: service.rate,
          priceLabel: service.priceLabel,
          priceUnit: service.priceUnit,
          qty: 1,
          units: service.priceUnit === 'fixed' ? 1 : units,
        },
      ]
    })
  }, [])

  /** Book again: merge whole lines in, replacing any existing line for the same service. */
  const addLines = useCallback((incoming: CartLine[]) => {
    setLines((prev) => {
      const ids = new Set(incoming.map((l) => l.serviceId))
      return [...prev.filter((l) => !ids.has(l.serviceId)), ...incoming]
    })
  }, [])

  const remove = useCallback((serviceId: string) => {
    setLines((prev) => prev.filter((l) => l.serviceId !== serviceId))
  }, [])

  const setQty = useCallback((serviceId: string, qty: number) => {
    setLines((prev) =>
      qty < 1
        ? prev.filter((l) => l.serviceId !== serviceId)
        : prev.map((l) => (l.serviceId === serviceId ? { ...l, qty: Math.min(qty, 20) } : l)),
    )
  }, [])

  const setUnits = useCallback((serviceId: string, units: number) => {
    setLines((prev) =>
      prev.map((l) => (l.serviceId === serviceId ? { ...l, units: Math.max(units, 0) } : l)),
    )
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartValue>(() => {
    const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
    // The visit charge applies once per booking, not per line.
    const visitCharge = lines.length > 0 ? VISIT_CHARGE : 0
    return {
      lines,
      add,
      addLines,
      remove,
      setQty,
      setUnits,
      clear,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
      visitCharge,
      total: subtotal + visitCharge,
      hydrated,
    }
  }, [lines, add, addLines, remove, setQty, setUnits, clear, hydrated])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}

export { lineTotal }

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, Clock, MapPin, Loader2, ChevronRight, ShoppingBag } from 'lucide-react'
import { formatINR } from '@prime/shared'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { statusMeta } from '@/lib/order-status'

interface BookingItem {
  service_name: string
  qty: number
}
interface Booking {
  id: string
  order_number: string
  status: string
  scheduled_date: string | null
  scheduled_slot: string | null
  city: string
  total: number
  created_at: string | null
  items: BookingItem[]
}

export default function MyBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('orders')
      .select('id, order_number, status, scheduled_date, scheduled_slot, city, total, created_at, items:order_items(service_name, qty)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setBookings((data as unknown as Booking[]) ?? [])
      })
  }, [user])

  if (error) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
  }
  if (!bookings) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }
  if (bookings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 grid place-items-center mb-4">
          <CalendarClock className="w-8 h-8 text-primary" />
        </div>
        <p className="font-bold text-gray-800 text-lg">No bookings yet</p>
        <p className="text-gray-500 text-sm mt-1">Your booked services will appear here.</p>
        <Link href="/services" className="mt-5 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
          <ShoppingBag className="w-4 h-4" /> Browse services
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => {
        const meta = statusMeta(b.status)
        const summary = b.items.map((i) => `${i.service_name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')
        return (
          <Link
            key={b.id}
            href={`/account/bookings/${b.id}`}
            className="block rounded-2xl border border-gray-100 bg-white p-4 hover:border-primary/30 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-gray-900">{b.order_number}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.className}`}>{meta.label}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">{summary || '—'}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                  {b.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" />
                      {new Date(b.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {b.scheduled_slot && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {b.scheduled_slot}</span>}
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {b.city}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-primary">{formatINR(Number(b.total))}</p>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-2" />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

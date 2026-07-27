'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarClock, MapPin } from 'lucide-react'

const TABS = [
  { href: '/account', label: 'My Bookings', icon: CalendarClock, exact: true },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin, exact: false },
]

export function AccountNav() {
  const pathname = usePathname()
  return (
    <nav className="mt-5 flex gap-1 border-b border-gray-100">
      {TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </Link>
        )
      })}
    </nav>
  )
}

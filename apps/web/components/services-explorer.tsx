'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Building2, Bug, Gem, Paintbrush, Droplets, Settings, Home,
  Clock, MapPin, ShoppingBag, LayoutGrid, Search, X, type LucideIcon,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCity } from '@/lib/city-context'
import type { HomeCategory, HomeService } from '@/lib/services-data'

const ICONS: Record<string, LucideIcon> = {
  Home, Sparkles, Building2, Bug, Gem, Paintbrush, Droplets, Settings,
}

export function ServiceCard({ svc, city }: { svc: HomeService; city: string }) {
  const { addToCart, cart } = useCart()
  const inCart = cart.some((c) => c.id === svc.id)

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <Link href={`/services/${svc.slug}`} className="block h-36 overflow-hidden">
        <img src={svc.img} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/services/${svc.slug}`}>
          <h3 className="font-bold text-sm text-gray-800 leading-snug hover:text-primary transition-colors line-clamp-2">
            {svc.name}
          </h3>
        </Link>
        {svc.tagline && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{svc.tagline}</p>}

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          {svc.duration && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {svc.duration}</span>
          )}
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {city}</span>
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <p className="text-primary font-black">{svc.priceStr}</p>
          <button
            onClick={() => addToCart({ id: svc.id, name: svc.name, img: svc.img, price: svc.price, priceStr: svc.priceStr })}
            className={`text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center gap-1 ${
              inCart ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            {inCart ? 'Added' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Category tabs that actually FILTER the catalog (previously cosmetic).
 * `initialCategory` lets a page deep-link into a category.
 */
export function ServicesExplorer({
  services,
  categories,
  initialCategory = 'All',
  heading = 'Our Services',
  subheading = 'Browse by category — every service is delivered by verified professionals',
}: {
  services: HomeService[]
  categories: HomeCategory[]
  initialCategory?: string
  heading?: string
  subheading?: string
}) {
  const [active, setActive] = useState(initialCategory)
  const [query, setQuery] = useState('')
  const { city } = useCity()
  const cityLabel = city ?? 'Your City'

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: services.length }
    for (const c of categories) map[c.name] = services.filter((s) => s.category === c.name).length
    return map
  }, [services, categories])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter((s) => {
      if (active !== 'All' && s.category !== active) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        (s.tagline ?? '').toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [services, active, query])

  return (
    <section id="services" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">{heading}</h2>
          <p className="text-gray-500 mt-2">{subheading}</p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services…"
              aria-label="Search services"
              className="w-full rounded-full border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <TabButton active={active === 'All'} onClick={() => setActive('All')} icon={LayoutGrid} label="All" count={counts.All} />
          {categories.map((cat) => {
            const Icon = ICONS[cat.icon ?? ''] ?? Sparkles
            return (
              <TabButton
                key={cat.slug}
                active={active === cat.name}
                onClick={() => setActive(cat.name)}
                icon={Icon}
                label={cat.name}
                count={counts[cat.name] ?? 0}
              />
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            {query ? `No services match “${query}”.` : 'No services in this category yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map((svc) => (
              <ServiceCard key={svc.id} svc={svc} city={cityLabel} />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Showing {filtered.length} of {services.length} services
        </p>
      </div>
    </section>
  )
}

function TabButton({
  active, onClick, icon: Icon, label, count,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
        active
          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
          : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
        {count}
      </span>
    </button>
  )
}

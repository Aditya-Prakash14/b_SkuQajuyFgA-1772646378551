'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Search, Star } from 'lucide-react'
import { toast } from 'sonner'
import { toggleServiceActive } from '@/app/dashboard/services/actions'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

export interface ServiceRow {
  id: string
  name: string
  slug: string
  priceLabel: string
  is_active: boolean
  rating: number
  bookings: string
  category: string
}

export function ServicesTable({
  services,
  categories,
}: {
  services: ServiceRow[]
  categories: { id: string; name: string }[]
}) {
  const [items, setItems] = useState(services)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [active, setActive] = useState('all')
  const [, startTransition] = useTransition()

  useEffect(() => setItems(services), [services])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.slug.toLowerCase().includes(q)) return false
      if (cat !== 'all' && s.category !== cat) return false
      if (active === 'active' && !s.is_active) return false
      if (active === 'inactive' && s.is_active) return false
      return true
    })
  }, [items, query, cat, active])

  function toggle(id: string, next: boolean) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: next } : s)))
    startTransition(async () => {
      const res = await toggleServiceActive(id, next)
      if ('error' in res) {
        toast.error(res.error)
        setItems((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !next } : s)))
      } else {
        toast.success(next ? 'Service is now live on the site' : 'Service hidden from the site')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-3">
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={active} onChange={(e) => setActive(e.target.value)} className="w-32">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <THead>
            <TR>
              <TH>Service</TH>
              <TH>Category</TH>
              <TH>Price</TH>
              <TH>Rating</TH>
              <TH>Live</TH>
              <TH className="text-right">Edit</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((s) => (
              <TR key={s.id}>
                <TD>
                  <Link href={`/dashboard/services/${s.id}`} className="font-medium hover:text-primary">
                    {s.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">/{s.slug}</p>
                </TD>
                <TD>
                  <Badge variant="secondary">{s.category}</Badge>
                </TD>
                <TD className="whitespace-nowrap font-medium">{s.priceLabel}</TD>
                <TD>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {s.rating} <span className="text-muted-foreground">· {s.bookings}</span>
                  </span>
                </TD>
                <TD>
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => toggle(s.id, v)}
                    aria-label="Toggle active"
                  />
                </TD>
                <TD className="text-right">
                  <Link
                    href={`/dashboard/services/${s.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR>
                <TD className="py-10 text-center text-muted-foreground" colSpan={6}>
                  No services match your filters.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {items.length} services
      </p>
    </div>
  )
}

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatINRShort } from '@prime/shared'
import { Button } from '@/components/ui/button'
import { ServicesTable, type ServiceRow } from '@/components/services/services-table'
import { PrimeNowSlotPricing, type PrimeNowSlotRow } from '@/components/prime-now/slot-pricing'

export default async function ServicesPage() {
  const supabase = await createClient()

  const [{ data: services }, { data: categories }, { data: slots }] = await Promise.all([
    supabase
      .from('services')
      .select('id,name,slug,price,display_price_label,is_active,rating,bookings_count,category:service_categories(name)')
      .order('name'),
    supabase.from('service_categories').select('id,name').order('sort_order'),
    supabase.from('prime_now_slots').select('id,label,sublabel,minutes,price,is_active').order('sort_order'),
  ])

  const rows: ServiceRow[] = (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    priceLabel: s.display_price_label ?? formatINRShort(Number(s.price)),
    is_active: !!s.is_active,
    rating: Number(s.rating ?? 0),
    bookings: s.bookings_count ?? '0',
    category: (s.category as { name: string } | null)?.name ?? '—',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Services &amp; Pricing</h1>
          <p className="text-muted-foreground">The catalog the marketing site reads from</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/services/new">
            <Plus className="h-4 w-4" /> New service
          </Link>
        </Button>
      </div>

      <ServicesTable services={rows} categories={categories ?? []} />

      <PrimeNowSlotPricing
        slots={((slots ?? []) as PrimeNowSlotRow[]).map((s) => ({ ...s, price: Number(s.price) }))}
      />
    </div>
  )
}

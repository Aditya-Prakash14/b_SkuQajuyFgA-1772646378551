import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { VendorStatus } from '@prime/shared'
import { Button } from '@/components/ui/button'
import { VendorsBoard, type VendorCard } from '@/components/vendors/vendors-board'

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('vendors')
    .select('id,name,phone,city,status,commission_rate,services_offered')
    .order('created_at', { ascending: false })

  const vendors: VendorCard[] = (data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    phone: v.phone,
    city: v.city ?? '—',
    status: v.status as VendorStatus,
    commission: Number(v.commission_rate ?? 0),
    servicesCount: (v.services_offered ?? []).length,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Vendors</h1>
          <p className="text-muted-foreground">Onboarding pipeline &amp; field partners</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vendors/new">
            <Plus className="h-4 w-4" /> New vendor
          </Link>
        </Button>
      </div>

      {vendors.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No vendors yet. Add your first field partner.
        </div>
      ) : (
        <VendorsBoard vendors={vendors} />
      )}
    </div>
  )
}

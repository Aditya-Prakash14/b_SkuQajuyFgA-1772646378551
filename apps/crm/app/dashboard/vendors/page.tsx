import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { OnboardingStep, VendorStatus } from '@prime/shared'
import { Button } from '@/components/ui/button'
import { VendorsBoard, type VendorCard } from '@/components/vendors/vendors-board'

export default async function VendorsPage() {
  const supabase = await createClient()
  const [{ data }, { data: docRows }] = await Promise.all([
    supabase
      .from('vendors')
      .select('id,name,phone,city,status,commission_rate,services_offered,onboarding_step,submitted_at,auth_user_id')
      .order('created_at', { ascending: false }),
    // Per-vendor "N awaiting review" — one query, counted in memory.
    supabase.from('vendor_documents').select('vendor_id,status'),
  ])

  const pendingDocs = new Map<string, number>()
  for (const d of docRows ?? []) {
    if (d.status === 'pending') pendingDocs.set(d.vendor_id, (pendingDocs.get(d.vendor_id) ?? 0) + 1)
  }

  const vendors: VendorCard[] = (data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    phone: v.phone,
    city: v.city ?? '—',
    status: v.status as VendorStatus,
    commission: Number(v.commission_rate ?? 0),
    servicesCount: (v.services_offered ?? []).length,
    onboardingStep: v.onboarding_step as OnboardingStep,
    submittedAt: v.submitted_at,
    hasAppAccount: Boolean(v.auth_user_id),
    docsAwaitingReview: pendingDocs.get(v.id) ?? 0,
  }))

  const awaiting = vendors.filter((v) => v.onboardingStep === 'review' && v.status !== 'active' && v.status !== 'approved').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Vendors</h1>
          <p className="text-muted-foreground">
            Onboarding pipeline &amp; field partners
            {awaiting ? ` · ${awaiting} awaiting KYC review` : ''}
          </p>
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

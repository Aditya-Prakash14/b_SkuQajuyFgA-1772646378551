import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  formatINR,
  type KycDocStatus,
  type KycDocType,
  type OnboardingStep,
  type OrderStatus,
  type VendorStatus,
} from '@prime/shared'
import { OrderStatusBadge } from '@/components/status-badge'
import { VendorForm } from '@/components/vendors/vendor-form'
import { KycReview, type KycDoc } from '@/components/vendors/kyc-review'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|heic)$/i

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vendor } = await supabase.from('vendors').select('*').eq('id', id).single()
  if (!vendor) notFound()

  const [{ data: services }, { data: cities }, { data: orders }, { data: kycRows }] = await Promise.all([
    supabase.from('services').select('id,name').order('name'),
    supabase.from('cities').select('name').eq('is_active', true).order('name'),
    supabase
      .from('orders')
      .select('id,order_number,status,total,city,created_at')
      .eq('assigned_vendor_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('vendor_documents')
      .select('id,doc_type,status,storage_path,review_note,uploaded_at,reviewed_at')
      .eq('vendor_id', id)
      .order('uploaded_at', { ascending: true }),
  ])

  // The bucket is private. Signed URLs are minted here, server-side, under the
  // admin's own session — storage RLS ("admin read vendor-docs") does the gating,
  // so no service-role key is involved. One hour is plenty for a review pass.
  const paths = (kycRows ?? []).map((d) => d.storage_path)
  const { data: signed } = paths.length
    ? await supabase.storage.from('vendor-docs').createSignedUrls(paths, 60 * 60)
    : { data: [] as { path: string | null; signedUrl: string }[] }
  const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? '', s.signedUrl]))

  const docs: KycDoc[] = (kycRows ?? []).map((d) => ({
    id: d.id,
    doc_type: d.doc_type as KycDocType,
    status: d.status as KycDocStatus,
    review_note: d.review_note,
    uploaded_at: d.uploaded_at,
    reviewed_at: d.reviewed_at,
    url: urlByPath.get(d.storage_path) ?? null,
    isImage: IMAGE_EXT.test(d.storage_path),
  }))

  const history = orders ?? []

  return (
    <div className="space-y-6">
      <VendorForm
        mode="edit"
        vendorId={id}
        initial={vendor}
        services={services ?? []}
        cities={(cities ?? []).map((c) => c.name)}
      />

      <KycReview
        vendor={{
          id: vendor.id,
          name: vendor.name,
          status: vendor.status as VendorStatus,
          onboarding_step: vendor.onboarding_step as OnboardingStep,
          submitted_at: vendor.submitted_at,
          rejection_reason: vendor.rejection_reason,
          application_note: vendor.application_note,
          hasAppAccount: Boolean(vendor.auth_user_id),
        }}
        docs={docs}
      />

      <Card>
        <CardHeader>
          <CardTitle>Assignment history</CardTitle>
          <CardDescription>Orders assigned to this vendor</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>City</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {history.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/dashboard/orders/${o.id}`} className="font-medium hover:text-primary">
                        {o.order_number}
                      </Link>
                    </TD>
                    <TD>{o.city}</TD>
                    <TD className="whitespace-nowrap font-medium">{formatINR(Number(o.total))}</TD>
                    <TD>
                      <OrderStatusBadge status={o.status as OrderStatus} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

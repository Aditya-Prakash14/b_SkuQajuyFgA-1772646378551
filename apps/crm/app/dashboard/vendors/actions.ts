'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  KYC_REQUIRED_DOCS,
  KYC_DOC_LABELS,
  type KycDocStatus,
  type KycDocType,
  type VendorStatus,
  type VendorDocument,
  type Json,
  type TablesUpdate,
} from '@prime/shared'

export interface VendorInput {
  name: string
  phone: string
  email: string | null
  city: string | null
  status: VendorStatus
  commission_rate: number
  services_offered: string[]
  documents: VendorDocument[]
  /** Which business the partner is in; dispatch honours both. */
  accepts_deep_clean: boolean
  accepts_prime_now: boolean
}

type Result = { error: string } | { ok: true }

const isOnboarded = (status: VendorStatus) => status === 'approved' || status === 'active'

export async function createVendor(input: VendorInput): Promise<Result> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email,
      city: input.city,
      status: input.status,
      commission_rate: input.commission_rate,
      services_offered: input.services_offered,
      documents: input.documents as unknown as Json,
      accepts_deep_clean: input.accepts_deep_clean,
      accepts_prime_now: input.accepts_prime_now,
      onboarded_at: isOnboarded(input.status) ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not create vendor' }
  revalidatePath('/dashboard/vendors')
  redirect(`/dashboard/vendors/${data.id}`)
}

export async function updateVendor(id: string, input: VendorInput): Promise<Result> {
  const supabase = await createClient()
  const { data: existing } = await supabase.from('vendors').select('onboarded_at').eq('id', id).single()

  const patch: TablesUpdate<'vendors'> = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email,
    city: input.city,
    status: input.status,
    commission_rate: input.commission_rate,
    services_offered: input.services_offered,
    documents: input.documents as unknown as Json,
    accepts_deep_clean: input.accepts_deep_clean,
    accepts_prime_now: input.accepts_prime_now,
  }
  if (isOnboarded(input.status) && existing && !existing.onboarded_at) {
    patch.onboarded_at = new Date().toISOString()
  }

  const { error } = await supabase.from('vendors').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/vendors')
  revalidatePath(`/dashboard/vendors/${id}`)
  return { ok: true }
}

export async function updateVendorStatus(id: string, status: VendorStatus): Promise<Result> {
  const supabase = await createClient()
  const { data: existing } = await supabase.from('vendors').select('onboarded_at').eq('id', id).single()

  const patch: TablesUpdate<'vendors'> = { status }
  if (isOnboarded(status) && existing && !existing.onboarded_at) {
    patch.onboarded_at = new Date().toISOString()
  }

  const { error } = await supabase.from('vendors').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/vendors')
  return { ok: true }
}

// ── KYC review (vendor_documents + onboarding decision) ─────────────────────

/** Verify or reject one uploaded document. `note` is shown to the partner in the app. */
export async function reviewDocument(
  docId: string,
  vendorId: string,
  status: Extract<KycDocStatus, 'verified' | 'rejected'>,
  note: string | null,
): Promise<Result> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }
  if (status === 'rejected' && !note?.trim()) return { error: 'Tell the partner what to fix' }

  const { error } = await supabase
    .from('vendor_documents')
    .update({
      status,
      review_note: note?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id, // admin_users.id = auth.users.id
    })
    .eq('id', docId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/vendors/${vendorId}`)
  revalidatePath('/dashboard/vendors')
  return { ok: true }
}

export type KycDecision = 'approve' | 'activate' | 'reject' | 'suspend'

/**
 * The onboarding decision. Approve/activate are guarded: every required
 * document must be verified first (the board's raw status dropdown remains
 * the override for edge cases). Reject needs a reason — the app shows it.
 */
export async function decideVendor(id: string, decision: KycDecision, reason?: string | null): Promise<Result> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const patch: TablesUpdate<'vendors'> = {}

  if (decision === 'approve' || decision === 'activate') {
    const { data: docs } = await supabase.from('vendor_documents').select('doc_type,status').eq('vendor_id', id)
    const verified = new Set((docs ?? []).filter((d) => d.status === 'verified').map((d) => d.doc_type as KycDocType))
    const missing = KYC_REQUIRED_DOCS.filter((t) => !verified.has(t))
    if (missing.length) {
      return { error: `Verify every required document first — still open: ${missing.map((t) => KYC_DOC_LABELS[t]).join(', ')}` }
    }
    const { data: existing } = await supabase.from('vendors').select('onboarded_at').eq('id', id).single()
    patch.status = decision === 'approve' ? 'approved' : 'active'
    patch.onboarding_step = 'done'
    patch.rejection_reason = null
    if (!existing?.onboarded_at) patch.onboarded_at = now
  } else if (decision === 'reject') {
    if (!reason?.trim()) return { error: 'Give the partner a reason — it is shown in the app' }
    patch.status = 'rejected'
    patch.rejection_reason = reason.trim()
  } else {
    patch.status = 'suspended'
    patch.rejection_reason = reason?.trim() || null
  }

  const { error } = await supabase.from('vendors').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/vendors')
  revalidatePath(`/dashboard/vendors/${id}`)
  return { ok: true }
}

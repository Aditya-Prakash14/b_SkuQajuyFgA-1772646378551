'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { VendorStatus, VendorDocument, Json, TablesUpdate } from '@prime/shared'

export interface VendorInput {
  name: string
  phone: string
  email: string | null
  city: string | null
  status: VendorStatus
  commission_rate: number
  services_offered: string[]
  documents: VendorDocument[]
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

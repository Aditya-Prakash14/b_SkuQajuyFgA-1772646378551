'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { error: string } | { ok: true }

export type PrimeNowStatus = 'new' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled'

/** Move a request through the dispatch pipeline. */
export async function updatePrimeNowStatus(id: string, status: PrimeNowStatus): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('prime_now_requests').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/prime-now')
  return { ok: true }
}

/** Send the job to a partner. Assigning implies it is no longer sitting unclaimed. */
export async function assignPrimeNowVendor(id: string, vendorId: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('prime_now_requests')
    .update({
      assigned_vendor_id: vendorId || null,
      status: vendorId ? 'dispatched' : 'new',
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/prime-now')
  return { ok: true }
}

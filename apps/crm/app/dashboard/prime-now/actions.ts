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

/**
 * Broadcast to the next wave of eligible online partners. A new request
 * dispatches itself, and a cron re-broadcasts dead waves, so this is the manual
 * nudge for when ops wants to push one along.
 */
export async function dispatchPrimeNow(id: string): Promise<{ error: string } | { ok: true; sent: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('dispatch_prime_now', { p_request_id: id })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/prime-now')
  return { ok: true, sent: Number(data ?? 0) }
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

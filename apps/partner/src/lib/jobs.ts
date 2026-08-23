import { supabase } from './supabase'
import type { Job, JobStatus, Offer, VendorStats } from './types'

/** All jobs ever assigned to the signed-in vendor, newest scheduled first. */
export async function fetchMyJobs(): Promise<Job[]> {
  const { data, error } = await supabase.rpc('my_jobs')
  if (error) throw error
  // PostgREST serialises numeric as a JSON number, but coerce defensively —
  // the money maths below must never concatenate strings.
  return ((data ?? []) as Job[]).map((j) => ({
    ...j,
    total: Number(j.total),
    items: (j.items ?? []).map((i) => ({
      ...i,
      qty: Number(i.qty),
      unit_price: Number(i.unit_price),
      line_total: Number(i.line_total),
    })),
  }))
}

/** Earnings + rating, computed server-side so the commission rule lives in one place (0013). */
export async function fetchMyStats(): Promise<VendorStats | null> {
  const { data, error } = await supabase.rpc('my_stats')
  if (error) throw error
  const row = (data as VendorStats[] | null)?.[0]
  if (!row) return null
  return {
    commission_rate: Number(row.commission_rate ?? 0),
    completed_count: Number(row.completed_count ?? 0),
    month_jobs: Number(row.month_jobs ?? 0),
    month_gross: Number(row.month_gross ?? 0),
    month_payout: Number(row.month_payout ?? 0),
    all_time_payout: Number(row.all_time_payout ?? 0),
    rating_avg: row.rating_avg === null || row.rating_avg === undefined ? null : Number(row.rating_avg),
    rating_count: Number(row.rating_count ?? 0),
  }
}

/** vendor_assigned → in_progress → completed; anything else is rejected server-side. */
export async function updateJobStatus(orderId: string, status: JobStatus, cashCollected = false) {
  const { error } = await supabase.rpc('update_my_job_status', {
    p_order_id: orderId,
    p_status: status,
    p_cash_collected: cashCollected,
  })
  if (error) throw error
}

/**
 * Tell the customer you have set out. Allowed once, while the job is still
 * assigned and not started; the customer's timeline and phone get it.
 */
export async function markEnRoute(jobId: string) {
  const { error } = await supabase.rpc('mark_en_route', { p_job_id: jobId })
  if (error) throw error
}

export const isOpen = (j: Job) => j.status === 'vendor_assigned' || j.status === 'in_progress'

// ── Formatting helpers (no Intl dependency — Hermes support varies by build) ─

/** ₹ with Indian digit grouping: 3423 → ₹3,423 · 123456 → ₹1,23,456 */
export function formatINR(n: number) {
  const whole = Math.round(n)
  const s = String(Math.abs(whole))
  if (s.length <= 3) return `₹${whole < 0 ? '-' : ''}${s}`
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `₹${whole < 0 ? '-' : ''}${rest},${last3}`
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Local calendar date as YYYY-MM-DD (matches orders.scheduled_date). */
export function todayKey(d = new Date()) {
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 'YYYY-MM-DD' → 'Sat, 22 Aug'. Parsed as local time to avoid the UTC-shift bug. */
export function formatDay(key: string | null) {
  if (!key) return 'Date to be confirmed'
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]}`
}

/** Today / Overdue / Upcoming bucket for the open-jobs list. */
export function dayBucket(key: string | null): 'today' | 'overdue' | 'upcoming' | 'unscheduled' {
  if (!key) return 'unscheduled'
  const t = todayKey()
  if (key === t) return 'today'
  return key < t ? 'overdue' : 'upcoming'
}

/** Name of the current month, for the History header. */
export function currentMonthName() {
  return MONTHS[new Date().getMonth()]
}

// ── Availability and offers (auto-dispatch) ─────────────────────────────────

/** Go online / offline. Only online partners receive Prime Now offers. */
export async function setAvailability(online: boolean) {
  const { error } = await supabase.rpc('set_my_availability', { p_online: online })
  if (error) throw error
}

/** Open offers for this partner — already filtered to unexpired, server-side. */
export async function fetchMyOffers(): Promise<Offer[]> {
  const { data, error } = await supabase.rpc('my_offers')
  if (error) throw error
  return ((data ?? []) as Offer[]).map((o) => ({ ...o, total: Number(o.total) }))
}

/**
 * Take the job. First accept wins: if another partner got there first the
 * server raises, and the message is safe to show as-is.
 */
export async function acceptOffer(offerId: string) {
  const { error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
  if (error) throw error
}

export async function declineOffer(offerId: string) {
  const { error } = await supabase.rpc('decline_offer', { p_offer_id: offerId })
  if (error) throw error
}

/** Whole seconds left on an offer, floored at 0. */
export function secondsLeft(expiresAt: string, now = Date.now()) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
}

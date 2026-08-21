import { supabase } from './supabase'
import type { Job, JobStatus } from './types'

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

/** vendor_assigned → in_progress → completed; anything else is rejected server-side. */
export async function updateJobStatus(orderId: string, status: JobStatus, cashCollected = false) {
  const { error } = await supabase.rpc('update_my_job_status', {
    p_order_id: orderId,
    p_status: status,
    p_cash_collected: cashCollected,
  })
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

/** Jobs completed in the current calendar month, by updated_at. */
export function isThisMonth(iso: string) {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}

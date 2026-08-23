/**
 * Formatting helpers. No Intl dependency — Hermes ships with varying ICU
 * support, so digit grouping and dates are done by hand and behave identically
 * on every device.
 */

/** ₹ with Indian digit grouping: 3423 → ₹3,423 · 123456 → ₹1,23,456 */
export function formatINR(n: number) {
  const whole = Math.round(n)
  const s = String(Math.abs(whole))
  if (s.length <= 3) return `₹${whole < 0 ? '-' : ''}${s}`
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `₹${whole < 0 ? '-' : ''}${rest},${last3}`
}

/**
 * Like formatINR but keeps the paise: 1270.34 → ₹1,270.34. For tax lines,
 * where rounding each row would make them stop adding up to the total.
 */
export function formatINRPaise(n: number) {
  const [whole, frac] = Math.abs(n).toFixed(2).split('.')
  return `₹${n < 0 ? '-' : ''}${formatINR(Number(whole)).slice(1)}.${frac}`
}

/** "₹5 / sq. ft." → { amount: "₹5", unit: "sq. ft." } so a card can stack them. */
export function splitPriceLabel(label: string): { amount: string; unit: string | null } {
  const [amount, unit] = label.split(' / ')
  return { amount: amount ?? label, unit: unit ?? null }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Local calendar date as YYYY-MM-DD (matches orders.scheduled_date). */
export function dateKey(d = new Date()) {
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 'YYYY-MM-DD' → 'Sat, 22 Aug'. Parsed as local time to dodge the UTC shift. */
export function formatDay(key: string | null) {
  if (!key) return 'Date to be confirmed'
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]}`
}

/** Short form for a date strip chip: { dow: 'Sat', day: '22', month: 'Aug' } */
export function dateParts(d: Date) {
  return { dow: DAYS[d.getDay()], day: String(d.getDate()), month: MONTHS[d.getMonth()] }
}

/** '2026-08-23T10:15:00Z' → '23 Aug, 3:45 PM' */
export function formatStamp(iso: string) {
  const d = new Date(iso)
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${mins} ${ampm}`
}

/** The next N bookable days, starting tomorrow — same rule as the website. */
export function upcomingDays(count = 14): Date[] {
  const out: Date[] = []
  for (let i = 1; i <= count; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    out.push(d)
  }
  return out
}

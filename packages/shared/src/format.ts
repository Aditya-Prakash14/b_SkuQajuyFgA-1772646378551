/**
 * Money formatting — brief NFR: format via Intl.NumberFormat('en-IN', currency INR).
 * DB stores numeric(10,2); the app layer uses `number` and formats here.
 */
const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

/** e.g. 1499 -> "₹1,499.00" */
export function formatINR(amount: number): string {
  return INR.format(amount ?? 0)
}

/** e.g. 1499 -> "₹1,499" (no paise) — matches the marketing site's display style */
export function formatINRShort(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

/** Build a display label from a numeric price + unit, e.g. "₹7 / sq. ft." */
export function priceLabel(price: number, unit: PriceUnitLabelInput = 'fixed'): string {
  const base = formatINRShort(price)
  switch (unit) {
    case 'per_sqft':
      return `${base} / sq. ft.`
    case 'per_panel':
      return `${base} / panel`
    case 'per_seat':
      return `${base} / seat`
    default:
      return base
  }
}

type PriceUnitLabelInput = 'fixed' | 'per_sqft' | 'per_panel' | 'per_seat'

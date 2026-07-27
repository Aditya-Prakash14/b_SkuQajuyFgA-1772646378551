/**
 * GST — tax-INCLUSIVE model.
 *
 * Catalog prices already include 18% GST (the customer sees ₹2,499 and pays
 * ₹2,499). We never add tax on top; we derive the breakdown for the invoice:
 *
 *   total (gross)  = what the customer pays        = sum of line prices − discount
 *   taxable value  = total / 1.18                  (net of GST)
 *   tax (GST)      = total − taxable
 *   CGST = SGST    = tax / 2                        (intra-state supply)
 *
 * Keep this in lockstep with the SQL in supabase/migrations 0006 (create_booking)
 * — both must round identically or an order's stored totals will disagree with
 * what the UI recomputes.
 */
export const GST_RATE = 0.18

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export interface GstBreakdown {
  /** Sum of inclusive line prices, before any discount. */
  gross: number
  discount: number
  /** What the customer pays: gross − discount. */
  total: number
  /** Net of GST. */
  taxable: number
  /** Total GST contained in `total`. */
  tax: number
  cgst: number
  sgst: number
}

export function gstInclusive(gross: number, discount = 0): GstBreakdown {
  const total = round2(Math.max(gross - discount, 0))
  const taxable = round2(total / (1 + GST_RATE))
  const tax = round2(total - taxable)
  const cgst = round2(tax / 2)
  const sgst = round2(tax - cgst) // remainder, so cgst + sgst === tax exactly
  return { gross: round2(gross), discount: round2(discount), total, taxable, tax, cgst, sgst }
}

/**
 * Split a stored GST amount into CGST/SGST halves for display. Uses the same
 * remainder trick so the two halves always sum back to `tax` to the paisa.
 */
export function gstHalves(tax: number): { cgst: number; sgst: number } {
  const cgst = round2(tax / 2)
  return { cgst, sgst: round2(tax - cgst) }
}

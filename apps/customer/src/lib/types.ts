/**
 * Hand-maintained slice of the live schema — only what the customer app
 * touches. The app is a standalone npm project (see pnpm-workspace.yaml), so it
 * cannot import @prime/shared's generated types across the pnpm symlink.
 *
 * Naming note: the product spec calls these "bookings"; the database calls them
 * `orders`, because the CRM, the partner app and the website all already do.
 * One vocabulary in the data, the spec's vocabulary in the UI copy.
 */

// ── Catalogue ───────────────────────────────────────────────────────────────

export type PriceUnit = 'fixed' | 'per_sqft' | 'per_panel'

export interface Category {
  id: string
  slug: string
  name: string
  serviceCount: number
  /** Cheapest service's own label, so "₹5 / sq. ft." never flattens to "₹5". */
  fromPriceLabel: string
  image: string | null
}

export interface Service {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  categoryId: string
  categoryName: string
  /** Flat price, or the price of one unit. */
  rate: number
  priceUnit: PriceUnit
  priceLabel: string
  duration: string
  image: string | null
  includes: string[]
  rating: number
  reviewsCount: number
}

// ── Cart ────────────────────────────────────────────────────────────────────

export interface CartLine {
  /** services.id — create_booking resolves this. */
  serviceId: string
  name: string
  image: string | null
  rate: number
  priceLabel: string
  priceUnit: PriceUnit
  qty: number
  /** Area / panel count for per-unit services; 1 otherwise. */
  units: number
}

// ── Bookings ────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'vendor_assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface BookingItem {
  service_name: string
  qty: number
  units: number
  unit_price: number
  line_total: number
}

export interface Booking {
  id: string
  reference: string
  status: BookingStatus
  scheduledDate: string | null
  scheduledSlot: string | null
  city: string | null
  address: string
  notes: string | null
  subtotal: number
  tax: number
  total: number
  paymentStatus: string
  items: BookingItem[]
  createdAt: string
  /** Prime Now requests are a separate table; the list merges both. */
  kind: 'deep' | 'now'
  /** Prime Now only. */
  tasks?: string[]
}

export interface BookingEvent {
  id: string
  status: string
  note: string | null
  created_at: string
}

// ── Addresses & profile ─────────────────────────────────────────────────────

export type AddressLabel = 'Home' | 'Work' | 'Other'

export interface Address {
  id: string
  label: string | null
  full_address: string
  city: string
  is_default: boolean | null
}

export interface Profile {
  id: string
  name: string
  phone: string
  email: string | null
  city: string | null
}

export interface NotificationPrefs {
  booking_updates: boolean
  helper_en_route: boolean
  marketing: boolean
}

// ── Status presentation ─────────────────────────────────────────────────────

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Placed',
  confirmed: 'Confirmed',
  vendor_assigned: 'Helper assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  // Prime Now vocabulary, mapped for display.
  new: 'Finding a helper',
  dispatched: 'Helper assigned',
}

/** The timeline a customer expects to see, in order. */
export const TIMELINE_STEPS: { status: string; label: string; blurb: string }[] = [
  { status: 'pending', label: 'Booking placed', blurb: 'We have your request.' },
  { status: 'confirmed', label: 'Confirmed', blurb: 'Your slot is held.' },
  { status: 'vendor_assigned', label: 'Helper assigned', blurb: 'A verified helper is on the job.' },
  { status: 'in_progress', label: 'In progress', blurb: 'Work has started.' },
  { status: 'completed', label: 'Completed', blurb: 'Thank you for choosing us.' },
]

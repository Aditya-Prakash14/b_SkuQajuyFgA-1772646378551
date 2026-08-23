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

export type PriceUnit = 'fixed' | 'per_sqft' | 'per_panel' | 'per_seat'

export interface Category {
  id: string
  slug: string
  name: string
  serviceCount: number
  /** Cheapest service's own label, so "₹5 / sq. ft." never flattens to "₹5". */
  fromPriceLabel: string
  image: string | null
}

export interface HowItWorksStep {
  step: number | string
  title: string
  desc: string
}

export interface Faq {
  q: string
  a: string
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
  gallery: string[]
  includes: string[]
  whatWeClean: string[]
  howItWorks: HowItWorksStep[]
  notIncluded: string[]
  faqs: Faq[]
  rating: number
  reviewsCount: number
}

/** A row of the public_reviews view — display columns only, never the reviewer's id. */
export interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: string
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
  // Prime Now (prime_now_requests.status). in_progress / completed / cancelled
  // are shared with the order vocabulary above.
  | 'new'
  | 'dispatched'

export interface BookingItem {
  /** Null when the service was deleted from the catalogue after booking. */
  service_id: string | null
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

/** What my_booking_helper() lets a customer know about the partner on their job. */
export interface Helper {
  name: string
  rating: number | null
  ratingCount: number
  /** Only while the job is live; null otherwise. */
  phone: string | null
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

/** Prime Now has no events table; its timeline is derived from the status. */
export const PRIME_TIMELINE_STEPS: { status: string; label: string; blurb: string }[] = [
  { status: 'new', label: 'Request sent', blurb: 'Offered to verified helpers near you.' },
  { status: 'dispatched', label: 'Helper accepted', blurb: 'We call to confirm the arrival time.' },
  { status: 'in_progress', label: 'Work started', blurb: 'Your helper is on the job.' },
  { status: 'completed', label: 'Completed', blurb: 'Thank you for choosing us.' },
]

/** Arrival windows — byte-identical to apps/web/lib/slots.ts, plus the site's "any time" option. */
export const TIME_WINDOWS = ['Morning · 8 AM – 12 PM', 'Afternoon · 12 PM – 4 PM', 'Evening · 4 PM – 8 PM'] as const
export const ANY_TIME_WINDOW = "Any time — we'll confirm on call"

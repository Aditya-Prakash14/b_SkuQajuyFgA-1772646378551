/**
 * Hand-maintained slice of the database schema — only what the partner app
 * touches. The app is a standalone npm project (see pnpm-workspace.yaml), so it
 * cannot import @prime/shared's generated types across the pnpm symlink.
 *
 * Keep in sync with supabase/migrations/0008_vendor_app_onboarding.sql.
 */

export type OnboardingStep = 'profile' | 'documents' | 'review' | 'done'

export type VendorStatus = 'pending' | 'approved' | 'active' | 'suspended' | 'rejected'

export type DocType =
  | 'aadhaar'
  | 'pan'
  | 'address_proof'
  | 'bank_proof'
  | 'police_verification'
  | 'photo'

export type DocStatus = 'pending' | 'verified' | 'rejected'

export interface Vendor {
  id: string
  name: string
  phone: string
  email: string | null
  city: string | null
  status: VendorStatus
  services_offered: string[] | null
  application_note: string | null
  onboarding_step: OnboardingStep
  /** Partner-controlled availability; gates Prime Now offers. */
  is_online: boolean
  submitted_at: string | null
  rejection_reason: string | null
}

export interface VendorDocument {
  id: string
  vendor_id: string
  doc_type: DocType
  storage_path: string
  status: DocStatus
  review_note: string | null
  uploaded_at: string | null
}

export interface Service {
  id: string
  name: string
}

/**
 * The four documents submit_vendor_for_review() hard-requires. Keep this list
 * identical to the array inside that function or the app will let a partner
 * press Submit only to get a Postgres exception back.
 */
export const REQUIRED_DOCS: DocType[] = ['aadhaar', 'pan', 'address_proof', 'bank_proof']
export const OPTIONAL_DOCS: DocType[] = ['police_verification', 'photo']

export const DOC_LABELS: Record<DocType, string> = {
  aadhaar: 'Aadhaar card',
  pan: 'PAN card',
  address_proof: 'Address proof',
  bank_proof: 'Bank passbook / cancelled cheque',
  police_verification: 'Police verification',
  photo: 'Passport photo',
}

export const DOC_HINTS: Record<DocType, string> = {
  aadhaar: 'Front and back in one file',
  pan: 'Clear photo of the card',
  address_proof: 'Electricity bill, rent agreement or ration card',
  bank_proof: 'Must show your name, account number and IFSC',
  police_verification: 'Optional — speeds up approval',
  photo: 'Optional — used on your partner profile',
}

// ── Jobs (post-onboarding) — mirrors my_jobs() in 0010_vendor_jobs.sql ──────

export type JobStatus = 'vendor_assigned' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partial'

export interface JobItem {
  service_name: string
  qty: number
  /** Area / panel count for per-unit services; 1 otherwise. */
  units?: number
  unit_price: number
  line_total: number
  /** Prime Now only: what the customer asked for. */
  tasks?: string[]
}

/** Deep Cleaning order, or a Prime Now hourly request — same job list. */
export type JobKind = 'deep_clean' | 'prime_now'

export interface Job {
  kind: JobKind
  id: string
  order_number: string
  status: JobStatus
  scheduled_date: string | null // YYYY-MM-DD
  scheduled_slot: string | null
  city: string | null
  address: string | null
  notes: string | null
  total: number
  payment_status: PaymentStatus
  payment_method: string | null
  customer_name: string
  customer_phone: string
  items: JobItem[]
  created_at: string
  updated_at: string
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  vendor_assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// ── Stats — mirrors my_stats() in 0013_vendor_stats.sql ─────────────────────

export interface VendorStats {
  /** Platform commission, percent of service value (orders.subtotal). */
  commission_rate: number
  completed_count: number
  month_jobs: number
  /** What customers paid this month (GST-inclusive). */
  month_gross: number
  /** What the partner is owed this month: subtotal × (1 − commission). */
  month_payout: number
  all_time_payout: number
  rating_avg: number | null
  rating_count: number
}

// ── Offers (auto-dispatch) — mirrors my_offers() in 0019 ────────────────────

export interface Offer {
  offer_id: string
  kind: JobKind
  job_id: string
  reference: string
  /** ISO timestamp; the offer disappears after this. */
  expires_at: string
  city: string | null
  address: string | null
  notes: string | null
  total: number
  scheduled_label: string | null
  summary: string | null
}

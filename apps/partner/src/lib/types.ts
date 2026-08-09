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

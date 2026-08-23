/**
 * Product analytics, behind one function.
 *
 * The event names are the contract (docs/customer-app-master-prompt.md
 * Phase 4) and are meant to be mirrored on the website. No provider is wired
 * yet — there is no PostHog / Amplitude project — so events go to the console
 * in development and nowhere in release. When a provider exists, implement
 * `Provider` once here and nothing else changes.
 */

export type AnalyticsEvent =
  | 'sign_in'
  | 'setup_complete'
  | 'view_domain'
  | 'view_category'
  | 'view_service'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'booking_confirmed'
  | 'prime_now_slot_selected'
  | 'prime_now_request_submitted'
  | 'prime_now_matched'
  | 'reschedule_booking'
  | 'cancel_booking'
  | 'submit_review'
  | 'payment_success'

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>

export interface Provider {
  track: (event: AnalyticsEvent, props?: AnalyticsProps) => void
  identify?: (userId: string, traits?: AnalyticsProps) => void
  reset?: () => void
}

let provider: Provider | null = null

/** Install the real provider (PostHog, Amplitude…) once, at startup. */
export function setAnalyticsProvider(p: Provider | null) {
  provider = p
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps) {
  try {
    if (provider) provider.track(event, props)
    else if (__DEV__) console.log('[analytics]', event, props ?? '')
  } catch {
    // Analytics must never break a flow.
  }
}

export function identify(userId: string, traits?: AnalyticsProps) {
  try {
    provider?.identify?.(userId, traits)
  } catch {
    // see above
  }
}

export function resetAnalytics() {
  try {
    provider?.reset?.()
  } catch {
    // see above
  }
}

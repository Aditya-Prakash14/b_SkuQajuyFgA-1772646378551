import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PayClient } from './pay-client'

export const metadata: Metadata = {
  title: 'Pay | MyPrimeCompany',
  robots: { index: false, follow: false },
}

/**
 * The app's bridge to Razorpay Checkout.
 *
 * The customer app (Expo) opens this page in an auth session with the order
 * it just created through the razorpay-create-order function; Checkout runs
 * here in the browser, and the page sends the app back to its return URL with
 * the outcome. The webhook, not this page, is what marks the booking paid.
 */
export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayClient />
    </Suspense>
  )
}

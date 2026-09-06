'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Online payments on the website — the same razorpay-create-order edge
 * function the customer app uses. The function reads the booking as the
 * signed-in user (RLS proves ownership) and prices from the row, so nothing
 * the browser sends can change what is charged; the webhook is the only
 * thing that marks a booking paid.
 *
 * Mirror of the app's switch (src/lib/payments.ts): off until the gateway
 * keys are configured. Flip by setting NEXT_PUBLIC_ONLINE_PAYMENTS=true —
 * with the keys absent the function answers 503 and the button reports
 * "not set up yet", so flipping early is safe, just untidy.
 */
export const ONLINE_PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_ONLINE_PAYMENTS === 'true'

export type PayOutcome = 'success' | 'cancelled' | 'failed' | 'unavailable'

interface CheckoutOrder {
  order_id: string
  amount: number
  currency: string
  key_id: string
  reference: string
  name: string
  description: string
  prefill: { name?: string; email?: string; contact?: string }
}

type CheckoutResponse = { razorpay_payment_id?: string }

declare global {
  interface Window {
    Razorpay?: new (o: Record<string, unknown>) => { open: () => void }
  }
}

let scriptPromise: Promise<void> | null = null

/** Load checkout.js once; resolves when window.Razorpay exists. */
function loadCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'))
  if (window.Razorpay) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        scriptPromise = null
        reject(new Error('Could not load the payment window. Check your connection and try again.'))
      }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

/**
 * Start an online payment for one of the caller's own bookings and run
 * Razorpay Checkout to completion. Resolves with the outcome; 'success'
 * means Razorpay accepted the payment — the booking flips to paid moments
 * later when the webhook lands, so callers should re-fetch after a beat.
 */
export async function payForBooking(
  kind: 'deep' | 'now',
  id: string,
): Promise<{ outcome: PayOutcome; message?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke<CheckoutOrder>('razorpay-create-order', {
    body: { kind, id },
  })

  if (error || !data?.order_id) {
    // A FunctionsHttpError carries the function's JSON body with the reason.
    let message = 'Could not start the payment. Please try again.'
    let unavailable = false
    const ctx = (error as { context?: Response } | null)?.context
    if (ctx) {
      unavailable = ctx.status === 503
      try {
        const body = (await ctx.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        /* keep the default message */
      }
    }
    return { outcome: unavailable ? 'unavailable' : 'failed', message }
  }

  try {
    await loadCheckout()
  } catch (e) {
    return { outcome: 'failed', message: e instanceof Error ? e.message : 'Could not load the payment window.' }
  }

  return new Promise((resolve) => {
    const checkout = new window.Razorpay!({
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      name: data.name,
      description: data.description,
      order_id: data.order_id,
      prefill: data.prefill,
      theme: { color: '#111111' },
      handler: (_r: CheckoutResponse) => resolve({ outcome: 'success' }),
      modal: { ondismiss: () => resolve({ outcome: 'cancelled' }) },
    })
    checkout.open()
  })
}

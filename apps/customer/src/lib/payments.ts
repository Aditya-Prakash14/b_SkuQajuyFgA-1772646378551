import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

import { supabase } from './supabase'

/**
 * Online payment through Razorpay Checkout.
 *
 * Off until the business has a Razorpay account: the three function secrets
 * (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) are set,
 * the webhook URL is registered with Razorpay, and the website's /pay page is
 * deployed. Then this flag is the switch; "pay after the work" stays as the
 * other option either way.
 *
 * Flow: razorpay-create-order (our edge function, as this user) → the
 * website's /pay page runs Checkout → it sends the browser back to
 * `payment/return` with the outcome. The outcome is a hint for the screen;
 * the webhook is what marks the booking paid, and the tracking screen picks
 * that up live.
 */
export const ONLINE_PAYMENTS_ENABLED = false

const PAY_PAGE = 'https://www.myprimecompany.com/pay'

export type PaymentOutcome = 'success' | 'cancelled' | 'failed' | 'unknown'

interface CreateOrderResponse {
  order_id: string
  amount: number
  currency: string
  key_id: string
  reference: string
  name: string
  description: string
  prefill: { name?: string; contact?: string; email?: string }
  error?: string
}

export async function startOnlinePayment(kind: 'deep' | 'now', id: string): Promise<PaymentOutcome> {
  const { data, error } = await supabase.functions.invoke<CreateOrderResponse>('razorpay-create-order', {
    method: 'POST',
    body: { kind, id },
  })
  if (error) throw new Error(await describe(error))
  if (!data?.order_id) throw new Error(data?.error ?? 'Could not start the payment. Please try again.')

  const returnTo = Linking.createURL('payment/return')
  const url =
    `${PAY_PAGE}?order=${encodeURIComponent(data.order_id)}` +
    `&key=${encodeURIComponent(data.key_id)}` +
    `&amount=${data.amount}` +
    `&ref=${encodeURIComponent(data.reference)}` +
    `&description=${encodeURIComponent(data.description)}` +
    `&name=${encodeURIComponent(data.prefill.name ?? '')}` +
    `&contact=${encodeURIComponent(data.prefill.contact ?? '')}` +
    `&email=${encodeURIComponent(data.prefill.email ?? '')}` +
    `&return=${encodeURIComponent(returnTo)}`

  const result = await WebBrowser.openAuthSessionAsync(url, returnTo)
  if (result.type === 'success' && result.url) {
    const status = new URL(result.url).searchParams.get('status')
    if (status === 'success' || status === 'cancelled' || status === 'failed') return status
  }
  if (result.type === 'cancel' || result.type === 'dismiss') return 'cancelled'
  return 'unknown'
}

/** Function errors carry the JSON body; surface the server's sentence. */
async function describe(err: unknown): Promise<string> {
  const ctx = (err as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as { error?: string }
      if (body?.error) return body.error
    } catch {
      // fall through
    }
  }
  return err instanceof Error ? err.message : 'Could not start the payment. Please try again.'
}

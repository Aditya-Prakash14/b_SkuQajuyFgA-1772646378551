'use client'

import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type CheckoutResponse = { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string }
type CheckoutOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name?: string; email?: string; contact?: string }
  theme: { color: string }
  handler: (r: CheckoutResponse) => void
  modal: { ondismiss: () => void }
}

declare global {
  interface Window {
    Razorpay?: new (o: CheckoutOptions) => { open: () => void }
  }
}

/** Only the app's own schemes may receive the result. */
function safeReturn(raw: string | null) {
  if (!raw) return null
  if (/^(myprimecompany|exp|exps):\/\//i.test(raw)) return raw
  return null
}

export function PayClient() {
  const params = useSearchParams()
  const [state, setState] = useState<'loading' | 'open' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState('Opening secure payment…')
  const opened = useRef(false)

  const orderId = params.get('order') ?? ''
  const key = params.get('key') ?? ''
  const amount = Number(params.get('amount') ?? 0)
  const reference = params.get('ref') ?? ''
  const returnTo = safeReturn(params.get('return'))

  const finish = useCallback(
    (status: 'success' | 'cancelled' | 'failed', paymentId?: string) => {
      setState('done')
      setMessage(
        status === 'success'
          ? 'Payment received. Returning to the app…'
          : status === 'cancelled'
            ? 'Payment cancelled. Returning to the app…'
            : 'Payment did not go through. Returning to the app…',
      )
      if (returnTo) {
        const sep = returnTo.includes('?') ? '&' : '?'
        window.location.href = `${returnTo}${sep}status=${status}${paymentId ? `&payment_id=${encodeURIComponent(paymentId)}` : ''}&ref=${encodeURIComponent(reference)}`
      }
    },
    [returnTo, reference],
  )

  const open = useCallback(() => {
    if (opened.current || !window.Razorpay) return
    if (!orderId || !key || !(amount > 0)) {
      setState('error')
      setMessage('This payment link is incomplete. Go back to the app and try again.')
      return
    }
    opened.current = true
    setState('open')
    setMessage('Complete the payment in the window that opened.')
    const checkout = new window.Razorpay({
      key,
      amount,
      currency: 'INR',
      name: 'MyPrimeCompany',
      description: params.get('description') ?? reference,
      order_id: orderId,
      prefill: {
        name: params.get('name') ?? undefined,
        email: params.get('email') ?? undefined,
        contact: params.get('contact') ?? undefined,
      },
      theme: { color: '#0E5A63' },
      handler: (r) => finish('success', r.razorpay_payment_id),
      modal: { ondismiss: () => finish('cancelled') },
    })
    checkout.open()
  }, [amount, finish, key, orderId, params, reference])

  useEffect(() => {
    if (window.Razorpay) open()
  }, [open])

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onLoad={open} />
      <p className="label-mono text-muted-foreground">{reference || 'Payment'}</p>
      <h1 className="text-2xl font-extrabold text-foreground">
        {state === 'error' ? 'Something is missing' : state === 'done' ? 'Thank you' : 'Secure payment'}
      </h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      {state === 'open' ? (
        <button
          type="button"
          onClick={() => {
            opened.current = false
            open()
          }}
          className="rounded-2xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground"
        >
          Open the payment window again
        </button>
      ) : null}
      {state === 'done' && returnTo ? (
        <a href={returnTo} className="text-sm font-bold text-primary">
          Back to the app
        </a>
      ) : null}
    </main>
  )
}

'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { ONLINE_PAYMENTS_ENABLED, payForBooking } from '@/lib/payments'
import { Button } from '@/components/ui/button'

/**
 * "Pay now by UPI or card" for an unpaid booking. Renders nothing while the
 * gateway flag is off. On success the booking is marked paid by the webhook,
 * not by us — so we wait a beat and ask the page to re-fetch.
 */
export function PayOnlineButton({
  kind,
  id,
  onPaid,
}: {
  kind: 'deep' | 'now'
  id: string
  onPaid: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  if (!ONLINE_PAYMENTS_ENABLED) return null

  async function pay() {
    setBusy(true)
    setNote(null)
    const { outcome, message } = await payForBooking(kind, id)
    if (outcome === 'success') {
      setNote('Payment received — updating your booking…')
      // The webhook flips payment_status moments after capture.
      setTimeout(() => {
        onPaid()
        setBusy(false)
      }, 2500)
      return
    }
    setBusy(false)
    if (outcome === 'cancelled') setNote(null)
    else setNote(message ?? 'Payment did not go through. Please try again or pay after the service.')
  }

  return (
    <div className="mt-3 space-y-2">
      <Button onClick={pay} disabled={busy} className="w-full rounded-xl font-bold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {busy ? 'Processing…' : 'Pay now by UPI or card'}
      </Button>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

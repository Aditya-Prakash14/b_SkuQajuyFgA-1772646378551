import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Refund Policy | MyPrimeCompany',
  description: 'Our cancellation, re-service and refund policy.',
}

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated="8 July 2026"
      intro="Cancellations, re-service and refunds — clearly explained."
      sections={[
        {
          heading: '1. Free cancellation window',
          paras: [
            'You may cancel or reschedule any booking free of charge up to 12 hours before the scheduled slot. Contact us on +91 73496 03429 or WhatsApp to cancel.',
          ],
        },
        {
          heading: '2. Late cancellation',
          paras: [
            'Cancellations made less than 12 hours before the slot, or non-availability at the premises when the crew arrives, may attract a fee of up to 25% of the booking value to cover crew allocation and travel.',
          ],
        },
        {
          heading: '3. Re-service before refund',
          paras: [
            'If the quality of a completed service does not meet the standard described on the service page, our first remedy is a free re-service. Report the issue within 48 hours of completion and we will return to redo the affected scope.',
          ],
        },
        {
          heading: '4. When we issue a refund',
          paras: [
            'If a re-service is not possible or does not resolve the issue, we will refund the value of the affected portion of the service.',
            'If our crew does not arrive for a confirmed booking, you receive a full refund of any amount paid.',
          ],
        },
        {
          heading: '5. Refund timelines',
          paras: [
            'Approved refunds are processed within 5–7 working days to the original payment method. Cash payments are refunded by bank transfer or UPI.',
          ],
        },
      ]}
    />
  )
}

import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Terms & Conditions | MyPrimeCompany',
  description: 'The terms that govern the use of MyPrimeCompany services.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="8 July 2026"
      intro="The terms that govern your use of our website and services."
      sections={[
        {
          heading: '1. Booking a service',
          paras: [
            'A booking is confirmed once you receive an order number. Prices shown are for the scope described on the service page and are re-validated against our live catalogue at the time of booking.',
            'You must be signed in to place a booking. This allows us to link the order to you and to keep your booking history secure.',
          ],
        },
        {
          heading: '2. Pricing and scope',
          paras: [
            'Quoted prices assume a normal level of soiling and standard access to the property. Where the actual condition materially differs from what was described, our team will inform you before starting and agree any revision with you.',
            'Add-ons not listed under "What is included" on the service page are chargeable separately.',
          ],
        },
        {
          heading: '3. Access and safety',
          paras: [
            'You agree to provide safe access to the premises, water and electricity at the scheduled time. If our team cannot access the property at the agreed slot, a rescheduling fee may apply.',
            'Please secure valuables and inform us of any fragile or high-value items before work begins.',
          ],
        },
        {
          heading: '4. Service warranty',
          paras: [
            'If you are not satisfied with the result, notify us within 48 hours of service completion. We will return and re-perform the affected scope at no additional cost.',
            'The warranty does not cover damage caused by pre-existing defects, or by conditions disclosed to you before work began.',
          ],
        },
        {
          heading: '5. Cancellations',
          paras: [
            'Bookings may be cancelled or rescheduled free of charge up to 12 hours before the scheduled slot. Later cancellations may incur a fee to cover crew allocation.',
          ],
        },
        {
          heading: '6. Limitation of liability',
          paras: [
            'Our liability for any claim arising out of a service is limited to the value of that service. We are not liable for indirect or consequential loss.',
          ],
        },
      ]}
    />
  )
}

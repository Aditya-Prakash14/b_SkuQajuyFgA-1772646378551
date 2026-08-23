import type { Metadata } from 'next'
import { Breadcrumbs, PageShell } from '@/components/page-shell'
import { BookingPage } from '@/components/booking-page'

export const metadata: Metadata = {
  title: 'Book & Contact',
  description:
    'Confirm your booking, or reach My Prime Company by WhatsApp, phone or email. We respond to every enquiry the same day.',
}

export default function ContactPage() {
  return (
    <PageShell>
      <section className="border-b border-border px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: 'Book & Contact' }]} />
          <h1 className="mt-6 text-4xl font-extrabold sm:text-5xl">Book &amp; contact</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Review your cart, pick a date, and we will confirm the arrival window by phone.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <BookingPage />
        </div>
      </section>
    </PageShell>
  )
}

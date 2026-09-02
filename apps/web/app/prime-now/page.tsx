import type { Metadata } from 'next'
import { getCities } from '@/lib/services-data'
import { getSlots } from '@/lib/prime-now'
import { Breadcrumbs, PageShell } from '@/components/page-shell'
import { PrimeNowRequestFlow } from '@/components/prime-now/request-flow'

// Short revalidate so a CRM price change reaches the page within minutes.
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Prime Now',
  description:
    'Instant house help by the hour, from ₹199 for 30 minutes. Tell us what needs doing and a background-verified helper arrives — usually within the hour.',
}

/**
 * Prime Now has no catalogue on purpose: it is a request, not a menu. The
 * customer describes the work and it is dispatched to a helper.
 */
export default async function PrimeNowPage() {
  const [cities, slots] = await Promise.all([getCities(), getSlots()])

  return (
    <PageShell>
      <section className="bg-ink px-4 py-12 text-ink-foreground sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-foreground/60">
            <a href="/" className="transition-colors hover:text-brand">
              Home
            </a>
            <span>/</span>
            <span className="text-ink-foreground">Prime Now</span>
          </nav>
          <p className="label-mono mt-6 text-brand">On demand · by the hour</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold sm:text-5xl">
            Instant house help, at your door
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-foreground/70">
            No packages to pick through. Tell us how long you need someone and what needs doing —
            a verified helper arrives, usually within the hour.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <PrimeNowRequestFlow cities={cities} slots={slots} />
        </div>
      </section>
    </PageShell>
  )
}

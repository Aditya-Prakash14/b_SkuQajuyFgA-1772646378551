import type { Metadata } from 'next'
import { Check, X } from 'lucide-react'
import { getCities } from '@/lib/services-data'
import { getSlots, HELPERS_DO, HELPERS_DONT } from '@/lib/prime-now'
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

      {/* Scope: what an hourly helper does and does not do */}
      <section className="border-t border-border px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-extrabold sm:text-3xl">What helpers do — and don&apos;t</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            An hourly helper handles everyday house work. Specialised jobs belong with our
            scheduled services.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <p className="label-mono text-primary">Helpers do</p>
              <ul className="mt-4 space-y-3">
                {HELPERS_DO.map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-border bg-secondary/50 p-6 sm:p-8">
              <p className="label-mono text-muted-foreground">Helpers don&apos;t</p>
              <ul className="mt-4 space-y-3">
                {HELPERS_DONT.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}

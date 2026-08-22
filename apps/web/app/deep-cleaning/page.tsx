import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { getCategoryCards } from '@/lib/services-data'
import { Breadcrumbs, PageShell } from '@/components/page-shell'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Deep Cleaning',
  description:
    'Scheduled, flat-priced deep cleaning: homes from ₹1,499, offices, marble and floor polishing, and professional painting. Book a trained crew at your doorstep.',
}

/** Level 1 of the drill-down: category cards only, never a nested service grid. */
export default async function DeepCleaningPage() {
  const categories = await getCategoryCards()

  return (
    <PageShell>
      <section className="border-b border-border px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: 'Deep Cleaning' }]} />
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold sm:text-5xl">Deep Cleaning</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Booked in advance, priced up front, carried out by a trained crew. Pick a category to
            see what is included and what it costs.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/deep-cleaning/${c.slug}`}
              className="group overflow-hidden rounded-3xl border border-border bg-card transition-colors hover:border-primary"
            >
              <div className="relative h-52 sm:h-60">
                {c.img ? (
                  <Image
                    src={c.img}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-secondary" />
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-extrabold">{c.name}</h2>
                  <span className="label-mono shrink-0 text-muted-foreground">
                    {c.serviceCount} {c.serviceCount === 1 ? 'service' : 'services'}
                  </span>
                </div>
                {c.tagline && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.tagline}</p>
                )}
                <div className="mt-6 flex items-end justify-between">
                  <span>
                    <span className="label-mono block text-muted-foreground">From</span>
                    {/* Per-unit prices keep their own label on a second line so
                        "₹5 / sq. ft." never overflows or reads as a flat fee. */}
                    <span className="tabular text-2xl font-extrabold">
                      {c.fromPriceLabel.split(' / ')[0]}
                    </span>
                    {c.fromPriceLabel.includes(' / ') && (
                      <span className="block text-xs text-muted-foreground">
                        / {c.fromPriceLabel.split(' / ')[1]}
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-2 font-semibold text-primary">
                    View
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  )
}

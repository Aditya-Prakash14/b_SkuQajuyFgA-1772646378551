import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Check, Clock, Star } from 'lucide-react'
import {
  getAllServiceSlugs,
  getCategorySiblings,
  getServiceBySlug,
  getServiceCategoryRef,
  getServiceReviews,
} from '@/lib/services-data'
import { Breadcrumbs, PageShell } from '@/components/page-shell'
import { AddToCartButton } from '@/components/add-to-cart-button'
import ServiceBookingCard from '@/components/service-booking-card'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getAllServiceSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) return { title: 'Service not found' }
  return { title: service.name, description: service.description.slice(0, 160) }
}

/**
 * Level 3 of the drill-down. The URL stays /services/<slug> — it is what search
 * engines already have — but the breadcrumb and the related list both belong to
 * the service's category, never to a flat service index.
 */
export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) notFound()

  const categoryRef = await getServiceCategoryRef(slug)
  const [siblings, reviews] = await Promise.all([
    categoryRef ? getCategorySiblings(categoryRef.slug, slug, 4) : Promise.resolve([]),
    getServiceReviews(service.id),
  ])

  const numericPrice = Number(service.price.replace(/[^0-9.]/g, '')) || 0
  // The spec asks for six included items in two columns.
  const included = service.whatsIncluded.slice(0, 6)

  return (
    <PageShell>
      <section className="border-b border-border px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs
            trail={[
              { href: '/', label: 'Home' },
              { href: '/deep-cleaning', label: 'Deep Cleaning' },
              ...(categoryRef
                ? [{ href: `/deep-cleaning/${categoryRef.slug}`, label: categoryRef.name }]
                : []),
              { label: service.name },
            ]}
          />
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* ── Main column ─────────────────────────────────────────────── */}
          <div>
            <div className="relative h-64 overflow-hidden rounded-3xl border border-border sm:h-96">
              {service.heroImg ? (
                <Image
                  src={service.heroImg}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-secondary" />
              )}
            </div>

            <p className="label-mono mt-8 text-primary">{service.category}</p>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{service.name}</h1>
            {service.tagline && (
              <p className="mt-3 text-lg text-muted-foreground">{service.tagline}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {service.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {service.duration}
                </span>
              )}
              {service.rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-brand text-brand" />
                  <span className="tabular font-semibold text-foreground">{service.rating}</span>
                  {service.reviews > 0 && <span>({service.reviews} reviews)</span>}
                </span>
              )}
              {service.bookings && <span>{service.bookings} booked</span>}
            </div>

            {service.description && (
              <p className="mt-8 max-w-2xl leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            )}

            {included.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-extrabold">What&apos;s included</h2>
                <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {included.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reviews.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-extrabold">What customers say</h2>
                <div className="mt-5 space-y-4">
                  {reviews.slice(0, 3).map((r, i) => (
                    <figure key={i} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex gap-1" aria-label={`Rated ${r.rating} out of 5`}>
                        {Array.from({ length: 5 }, (_, n) => (
                          <Star
                            key={n}
                            className={
                              n < r.rating ? 'h-3.5 w-3.5 fill-brand text-brand' : 'h-3.5 w-3.5 text-border'
                            }
                          />
                        ))}
                      </div>
                      <blockquote className="mt-3 text-sm leading-relaxed">{r.comment}</blockquote>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky booking panel ────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-28">
            <ServiceBookingCard
              id={service.id}
              name={service.name}
              img={service.heroImg}
              price={numericPrice}
              priceStr={service.price}
              duration={service.duration}
              category={service.category}
            />
          </aside>
        </div>
      </section>

      {/* ── Related, from the same category ───────────────────────────────── */}
      {siblings.length > 0 && categoryRef && (
        <section className="border-t border-border bg-secondary/40 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl font-extrabold">More in {categoryRef.name}</h2>
              <Link
                href={`/deep-cleaning/${categoryRef.slug}`}
                className="font-semibold text-primary hover:underline"
              >
                See all
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {siblings.map((s) => (
                <article
                  key={s.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card"
                >
                  <Link href={`/services/${s.slug}`} className="relative block h-36">
                    {s.img ? (
                      <Image src={s.img} alt="" fill sizes="25vw" className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-secondary" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-sm font-bold">
                      <Link href={`/services/${s.slug}`} className="hover:text-primary">
                        {s.name}
                      </Link>
                    </h3>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                      <span>
                        <span className="tabular font-extrabold">{s.priceStr.split(' / ')[0]}</span>
                        {s.priceStr.includes(' / ') && (
                          <span className="block text-[11px] text-muted-foreground">
                            / {s.priceStr.split(' / ')[1]}
                          </span>
                        )}
                      </span>
                      <AddToCartButton
                        item={{
                          id: s.id,
                          name: s.name,
                          img: s.img,
                          price: s.price,
                          priceStr: s.priceStr,
                        }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Clock } from 'lucide-react'
import { getAllCategorySlugs, getCategoryBySlug } from '@/lib/services-data'
import { Breadcrumbs, PageShell } from '@/components/page-shell'
import { AddToCartButton } from '@/components/add-to-cart-button'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs()
  return slugs.map((category) => ({ category }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const cat = await getCategoryBySlug(category)
  if (!cat) return { title: 'Category not found' }
  return {
    title: cat.name,
    description: `${cat.name} — ${cat.services.length} services with flat, up-front pricing from MyPrimeCompany.`,
  }
}

/** Level 2: every service in one category, as its own page. */
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const cat = await getCategoryBySlug(category)
  if (!cat) notFound()

  return (
    <PageShell>
      <section className="border-b border-border px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs
            trail={[
              { href: '/', label: 'Home' },
              { href: '/deep-cleaning', label: 'Deep Cleaning' },
              { label: cat.name },
            ]}
          />
          <h1 className="mt-6 text-4xl font-extrabold sm:text-5xl">{cat.name}</h1>
          <p className="label-mono mt-3 text-muted-foreground">
            {cat.services.length} {cat.services.length === 1 ? 'service' : 'services'}
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          {cat.services.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
              Nothing listed here right now. Please check back soon.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cat.services.map((s) => (
                <article
                  key={s.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card"
                >
                  <Link href={`/services/${s.slug}`} className="relative block h-44">
                    {s.img ? (
                      <Image
                        src={s.img}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-extrabold">
                      <Link href={`/services/${s.slug}`} className="hover:text-primary">
                        {s.name}
                      </Link>
                    </h2>
                    {s.tagline && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{s.tagline}</p>
                    )}
                    {s.duration && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {s.duration}
                      </p>
                    )}
                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      <span>
                        <span className="tabular text-xl font-extrabold">
                          {s.priceStr.split(' / ')[0]}
                        </span>
                        {s.priceStr.includes(' / ') && (
                          <span className="block text-xs text-muted-foreground">
                            / {s.priceStr.split(' / ')[1]}
                          </span>
                        )}
                      </span>
                      {s.priceUnit === 'fixed' ? (
                        <AddToCartButton
                          item={{
                            id: s.id,
                            name: s.name,
                            img: s.img,
                            price: s.price,
                            priceStr: s.priceStr,
                            priceUnit: s.priceUnit,
                          }}
                        />
                      ) : (
                        // Priced per unit — the area is asked for on the detail
                        // page, so a card cannot add it straight to the cart.
                        <Link
                          href={`/services/${s.slug}`}
                          className="rounded-2xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary"
                        >
                          Choose area
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  )
}

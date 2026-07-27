import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  CheckCircle, XCircle, Star, ChevronRight, Clock, Users, Shield, ArrowLeft,
} from 'lucide-react'
import { getServiceBySlug, getRelatedServices, getAllServiceSlugs, getServiceReviews } from '@/lib/services-data'
import { PageShell } from '@/components/page-shell'
import ServiceBookingCard from '@/components/service-booking-card'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getAllServiceSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) return { title: 'Service Not Found' }
  return {
    title: `${service.name} | MyPrimeCompany`,
    description: service.description.slice(0, 160),
  }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) notFound()

  const [related, reviews] = await Promise.all([
    getRelatedServices(service.relatedIds),
    getServiceReviews(service.id),
  ])
  const numericPrice = parseInt(service.price.replace(/[^0-9]/g, '')) || 0

  const stars = (n: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < n ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
    ))

  return (
    <PageShell>
      <div className="bg-gray-50">
        {/* Hero */}
        <section className="relative h-105 sm:h-130 overflow-hidden">
          <img src={service.heroImg} alt={service.name} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-r from-primary/90 via-primary/70 to-transparent" />

          <div className="absolute top-6 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1.5 text-xs text-white/80">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/services" className="hover:text-white transition-colors">Services</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">{service.name}</span>
            </nav>
          </div>

          <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <span className="inline-block bg-accent/90 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">
              {service.category}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 leading-tight max-w-2xl">{service.name}</h1>
            <p className="text-white/85 text-base sm:text-lg max-w-xl mb-4">{service.tagline}</p>

            <div className="flex flex-wrap gap-4 text-white/90 text-sm">
              <span className="flex items-center gap-1.5">
                <div className="flex">{stars(Math.round(service.rating))}</div>
                <strong>{service.rating}</strong> ({service.reviews.toLocaleString()} reviews)
              </span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {service.duration}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {service.bookings} bookings</span>
            </div>
          </div>
        </section>

        {/* Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card title="About This Service">
                <p className="text-gray-600 leading-relaxed">{service.description}</p>
              </Card>

              <Card title="What We Cover">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.whatWeClean.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-gray-700 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="How It Works">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {service.howItWorks.map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center text-lg shrink-0">
                        {s.step}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{s.title}</p>
                        <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-lg font-bold mb-3 text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> What&apos;s Included
                    </h2>
                    <ul className="space-y-2">
                      {service.whatsIncluded.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-gray-700 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-3 text-red-600 flex items-center gap-2">
                      <XCircle className="w-5 h-5" /> Not Included
                    </h2>
                    <ul className="space-y-2">
                      {service.notIncluded.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-gray-700 text-sm">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {service.galleryImgs.length > 0 && (
                <Card title="Gallery">
                  <div className="grid grid-cols-3 gap-3">
                    {service.galleryImgs.map((src, i) => (
                      <div key={i} className="aspect-video overflow-hidden rounded-xl">
                        <img src={src} alt={`${service.name} ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {service.faqs.length > 0 && (
                <Card title="Frequently Asked Questions">
                  <div className="space-y-4">
                    {service.faqs.map((faq, i) => (
                      <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <p className="font-semibold text-gray-800 mb-1">{faq.q}</p>
                        <p className="text-gray-600 text-sm">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {reviews.length > 0 && (
                <Card title="Customer Reviews">
                  <div className="space-y-4">
                    {reviews.map((r, i) => (
                      <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <div className="flex">{stars(Math.round(r.rating))}</div>
                          {r.created_at && (
                            <span className="text-xs text-gray-400">
                              {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {r.comment && <p className="text-gray-600 text-sm mt-1.5">“{r.comment}”</p>}
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-green-600">
                          <CheckCircle className="w-3 h-3" /> Verified customer
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Sticky booking card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <ServiceBookingCard
                  id={service.id}
                  name={service.name}
                  img={service.heroImg}
                  price={numericPrice}
                  priceStr={service.price}
                />
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                  {[
                    { Icon: Shield, text: 'Background-verified professionals' },
                    { Icon: CheckCircle, text: 'Re-service guarantee if not satisfied' },
                    { Icon: Clock, text: 'On-time arrival, every time' },
                  ].map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-black text-primary mb-6">Related Services</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((rel) => (
                  <Link key={rel.slug} href={`/services/${rel.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                    <div className="h-40 overflow-hidden">
                      <img src={rel.heroImg} alt={rel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-4">
                      <span className="text-xs text-accent font-semibold uppercase tracking-wide">{rel.category}</span>
                      <h3 className="font-bold text-gray-800 mt-1 mb-1">{rel.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{rel.tagline}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-primary font-black text-lg">{rel.price}</span>
                        <span className="text-xs text-primary font-semibold group-hover:underline flex items-center gap-0.5">
                          View Details <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 text-center">
            <Link href="/services" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to All Services
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-primary">{title}</h2>
      {children}
    </section>
  )
}

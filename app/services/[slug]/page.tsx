import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Phone, MapPin, CheckCircle, XCircle, Star, ChevronRight,
  Clock, Users, Shield, ArrowLeft,
} from 'lucide-react'
import { getServiceBySlug, getRelatedServices, SERVICES } from '@/lib/services-data'
import ServiceBookingCard from '@/components/service-booking-card'
import CartButton from '@/components/cart-button'

// ─── Static params ───────────────────────────────────────────────────────────
export function generateStaticParams() {
  return SERVICES.map(s => ({ slug: s.slug }))
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) return { title: 'Service Not Found' }
  return {
    title: `${service.name} | Prime Home Care`,
    description: service.description.slice(0, 160),
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) notFound()

  const related = getRelatedServices(service.relatedSlugs)
  const numericPrice = parseInt(service.price.replace(/[^0-9]/g, '')) || 0

  const stars = (n: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < n ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">

      {/* ── Announcement Bar ──────────────────────────────── */}
      <div className="bg-primary text-white text-xs sm:text-sm py-2 text-center px-4">
        <Phone className="w-3.5 h-3.5 inline-block mr-1" /> Call us anytime:{' '}
        <a href="tel:+917349603429" className="font-semibold hover:underline">+91 73496 03429</a>
        &nbsp;|&nbsp; Professional cleaning services across India
      </div>

      {/* ── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0">
            <img
              src="/prime%20Home%20cleaning.svg"
              alt="Prime Home Care Logo"
              className="h-16 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <Link href="/#services" className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Services</Link>
            <Link href="/#why-us"   className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Why Us</Link>
            <Link href="/#blog"     className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Blog</Link>
            <Link href="/#contact"  className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Contact</Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <a href="tel:+917349603429" className="hidden md:flex items-center gap-1.5 text-primary font-semibold text-sm">
              <Phone className="w-4 h-4" /> +91 73496 03429
            </a>
            <CartButton />
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative h-105 sm:h-130 overflow-hidden">
        <img
          src={service.heroImg}
          alt={service.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* dark overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-primary/90 via-primary/70 to-transparent" />

        {/* Breadcrumb */}
        <div className="absolute top-6 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs text-white/80">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/" className="hover:text-white transition-colors">Services</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">{service.name}</span>
          </nav>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <span className="inline-block bg-accent/90 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">
            {service.category}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 leading-tight max-w-2xl">
            {service.name}
          </h1>
          <p className="text-white/85 text-base sm:text-lg max-w-xl mb-4">{service.tagline}</p>

          <div className="flex flex-wrap gap-4 text-white/90 text-sm">
            <span className="flex items-center gap-1.5">
              <div className="flex">{stars(Math.round(service.rating))}</div>
              <strong>{service.rating}</strong> ({service.reviews.toLocaleString()} reviews)
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {service.duration}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {service.bookings} bookings
            </span>
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left Column ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-primary">About This Service</h2>
              <p className="text-gray-600 leading-relaxed">{service.description}</p>
            </section>

            {/* What we clean */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-primary">What We Cover</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {service.whatWeClean.map(item => (
                  <li key={item} className="flex items-start gap-2 text-gray-700 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* How it works */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 text-primary">How It Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {service.howItWorks.map(step => (
                  <div key={step.step} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center text-lg shrink-0">
                      {step.step}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{step.title}</p>
                      <p className="text-gray-500 text-sm mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Included / Not Included */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-bold mb-3 text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> What's Included
                  </h2>
                  <ul className="space-y-2">
                    {service.whatsIncluded.map(item => (
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
                    {service.notIncluded.map(item => (
                      <li key={item} className="flex items-start gap-2 text-gray-700 text-sm">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Gallery */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-primary">Gallery</h2>
              <div className="grid grid-cols-3 gap-3">
                {service.galleryImgs.map((src, i) => (
                  <div key={i} className="aspect-video overflow-hidden rounded-xl">
                    <img src={src} alt={`${service.name} ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </section>

            {/* FAQs */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-primary">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {service.faqs.map((faq, i) => (
                  <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <p className="font-semibold text-gray-800 mb-1">{faq.q}</p>
                    <p className="text-gray-600 text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* ── Right Column (Sticky Booking Card) ──────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">

              {/* Interactive booking card */}
              <ServiceBookingCard
                id={service.slug}
                name={service.name}
                img={service.heroImg}
                price={numericPrice}
                priceStr={service.price}
              />

              {/* Trust Badges */}
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

        {/* ── Related Services ─────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-black text-primary mb-6">Related Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map(rel => (
                <Link
                  key={rel.slug}
                  href={`/services/${rel.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="h-40 overflow-hidden">
                    <img
                      src={rel.heroImg}
                      alt={rel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
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

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Services
          </Link>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="bg-primary mt-16 py-10 text-center text-sm text-white/70">
        <p className="font-black text-white text-lg mb-1">Prime Home Care</p>
        <p>Professional Cleaning &amp; Pest Control Services across India</p>
        <p className="mt-2">
          <a href="tel:+917349603429" className="text-accent hover:underline">+91 73496 03429</a>
        </p>
        <p className="mt-4">&copy; {new Date().getFullYear()} Prime Home Care. All rights reserved.</p>
      </footer>

    </div>
  )
}

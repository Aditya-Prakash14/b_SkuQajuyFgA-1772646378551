'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check, MessageCircle, Minus, Plus, Search, Star } from 'lucide-react'
import { useCity } from '@/lib/city-context'

const WHATSAPP = 'https://wa.me/917349603429'

/* ── 3. Hero ──────────────────────────────────────────────────────────────── */

export function HeroSection() {
  const { city, setCity, cities } = useCity()

  return (
    <section className="border-b border-border px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="label-mono text-primary">Home &amp; office care</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
            Professional Services at Your Doorstep
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Book a scheduled deep clean, or get instant house help by the hour. Verified
            professionals, flat prices, across India.
          </p>

          {/* The one soft shadow the palette allows, per the spec. */}
          <div className="mt-8 flex flex-col gap-2 rounded-3xl border border-border bg-card p-2 shadow-panel sm:flex-row sm:items-center">
            <label className="flex flex-1 items-center gap-3 px-4 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Your city</span>
              <select
                value={city ?? ''}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              >
                <option value="">Where do you need us?</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <Link
              href="/deep-cleaning"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Book Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Not happy? We will come back and re-clean at no extra cost.
          </p>
        </div>

        {/* Image collage with the 1M+ stat tile */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <Photo src="/Office cleaning PC.jpg" alt="Team cleaning an office" className="h-44 sm:h-56" />
              <Photo src="/Sofa Shampooing PC.jpg" alt="Sofa shampooing" className="h-32 sm:h-40" />
            </div>
            <div className="space-y-3 pt-8">
              <Photo src="/marble polishing PC.jpg" alt="Marble polishing" className="h-32 sm:h-40" />
              <Photo src="/glass cleaning PC.jpg" alt="Glass cleaning" className="h-44 sm:h-56" />
            </div>
          </div>
          <div className="absolute -bottom-4 left-4 rounded-2xl bg-ink px-5 py-4 text-ink-foreground shadow-panel">
            <p className="tabular text-3xl font-extrabold">1M+</p>
            <p className="label-mono mt-0.5 text-brand">Customers served</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Photo({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border ${className}`}>
      <Image src={src} alt={alt} fill sizes="(max-width: 1024px) 45vw, 22vw" className="object-cover" />
    </div>
  )
}

/* ── 4. Trust strip ───────────────────────────────────────────────────────── */

const STATS = [
  { value: '1M+', label: 'Customers served' },
  { value: '4.8', label: 'Average rating' },
  { value: '14', label: 'Cities covered' },
  { value: '100%', label: 'Verified professionals' },
]

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-secondary/50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="tabular text-3xl font-extrabold text-primary">{s.value}</p>
            <p className="label-mono mt-1 text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── 5. The two domains ───────────────────────────────────────────────────── */

export function DomainCards() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Two ways we help</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Plan a deep clean in advance, or get someone to your door within the hour.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* Deep Cleaning — light */}
          <Link
            href="/deep-cleaning"
            className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-8 transition-colors hover:border-primary"
          >
            <div>
              <p className="label-mono text-primary">Scheduled · flat price</p>
              <h3 className="mt-4 text-3xl font-extrabold">Deep Cleaning</h3>
              <p className="mt-3 max-w-sm text-muted-foreground">
                Homes, offices, marble floors and painting. Booked in advance, priced up front,
                done by a trained crew.
              </p>
            </div>
            <div className="mt-10 flex items-end justify-between">
              <span>
                <span className="label-mono block text-muted-foreground">From</span>
                <span className="tabular text-3xl font-extrabold">₹1,499</span>
              </span>
              <span className="inline-flex items-center gap-2 font-semibold text-primary">
                Browse categories
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          {/* Prime Now — dark */}
          <Link
            href="/prime-now"
            className="group flex flex-col justify-between rounded-3xl bg-ink p-8 text-ink-foreground transition-opacity hover:opacity-95"
          >
            <div>
              <p className="label-mono text-brand">On demand · by the hour</p>
              <h3 className="mt-4 text-3xl font-extrabold">Prime Now</h3>
              <p className="mt-3 max-w-sm text-ink-foreground/70">
                Instant house help. Tell us what needs doing and a verified helper arrives — today,
                within the hour.
              </p>
            </div>
            <div className="mt-10 flex items-end justify-between">
              <span>
                <span className="label-mono block text-ink-foreground/60">From</span>
                <span className="tabular text-3xl font-extrabold">₹199</span>
                <span className="ml-1 text-sm text-ink-foreground/60">/ 30 min</span>
              </span>
              <span className="inline-flex items-center gap-2 font-semibold text-brand">
                Request a helper
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── 6. How it works ──────────────────────────────────────────────────────── */

const STEPS = [
  { title: 'Tell us what you need', body: 'Pick a service and a time, or describe the job for Prime Now.' },
  { title: 'We assign a verified pro', body: 'A background-checked professional near you takes the job.' },
  { title: 'Pay after the work is done', body: 'Flat price, no surprises. Not happy? We re-clean free.' },
]

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-extrabold sm:text-4xl">How it works</h2>
        {/* Numbered because these are genuinely sequential. */}
        <ol className="mt-10 grid gap-8 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="label-mono text-primary">Step {String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ── 7. Why choose us — dark band ─────────────────────────────────────────── */

const WHY = [
  { title: 'Verified Professionals', body: 'Every professional is background-checked and trained before their first job.' },
  { title: 'Eco-Friendly Products', body: 'Cleaning agents that are safe around children and pets.' },
  { title: 'On-Time Service', body: 'We arrive in the slot you booked, or we tell you before it starts.' },
  { title: 'Free re-clean', body: 'Not happy? We will come back and re-clean at no extra cost.' },
]

export function WhyUs() {
  return (
    <section id="why-us" className="bg-ink px-4 py-16 text-ink-foreground sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Why Choose MyPrimeCompany?</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="rounded-2xl border border-white/10 p-6">
              <Check className="h-5 w-5 text-brand" />
              <h3 className="mt-4 font-bold">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-foreground/70">{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 8. Gallery ───────────────────────────────────────────────────────────── */

const GALLERY = [
  { src: '/Office Interior glass PC.jpg', alt: 'Interior glass cleaning in an office' },
  { src: '/floor polishing PC.jpg', alt: 'Floor polishing in progress' },
  { src: '/Kitchen Sink cleaning PC.jpg', alt: 'Kitchen sink deep cleaning' },
  { src: '/toilet cleaning PC.jpg', alt: 'Bathroom deep cleaning' },
]

export function Gallery() {
  return (
    <section id="gallery" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Our work</h2>
        <p className="mt-3 text-muted-foreground">Real jobs, photographed on site.</p>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {GALLERY.map((g) => (
            <div key={g.src} className="relative h-48 overflow-hidden rounded-2xl border border-border sm:h-64">
              <Image src={g.src} alt={g.alt} fill sizes="(max-width: 1024px) 45vw, 22vw" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 9. Testimonial ───────────────────────────────────────────────────────── */

export function Testimonials() {
  return (
    <section className="border-y border-border bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <figure className="mx-auto max-w-3xl text-center">
        <div className="flex justify-center gap-1" aria-label="Rated 5 out of 5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="h-4 w-4 fill-brand text-brand" />
          ))}
        </div>
        <blockquote className="mt-6 text-2xl font-bold leading-snug sm:text-3xl">
          “The team arrived on time and left the flat spotless. Booking took two minutes and the
          price was exactly what was quoted.”
        </blockquote>
        <figcaption className="label-mono mt-6 text-muted-foreground">Abhi A · Verified customer</figcaption>
      </figure>
    </section>
  )
}

/* ── 10. Corporate clients ────────────────────────────────────────────────── */

const CLIENTS = [
  { src: '/viatris.webp', alt: 'Viatris' },
  { src: '/mylan.webp', alt: 'Mylan' },
  { src: '/LaurusBio_Black.png', alt: 'Laurus Bio' },
  { src: '/primeeagle.jpeg', alt: 'Prime Eagle' },
]

export function Clients() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="label-mono text-center text-muted-foreground">Trusted by</p>
        <div className="mt-8 grid grid-cols-2 items-center gap-8 sm:grid-cols-4">
          {CLIENTS.map((c) => (
            <div key={c.src} className="relative mx-auto h-12 w-full max-w-36">
              <Image src={c.src} alt={c.alt} fill sizes="150px" className="object-contain" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 11. FAQ ──────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: 'What is the difference between Deep Cleaning and Prime Now?',
    a: 'Deep Cleaning is booked in advance at a flat price for a defined job — a 2 BHK flat, an office, a marble floor. Prime Now is instant help charged by the hour: you tell us what needs doing and a helper comes over, usually within the hour.',
  },
  {
    q: 'Do I need to provide cleaning supplies?',
    a: 'No. Our professionals bring their own equipment and eco-friendly cleaning products.',
  },
  {
    q: 'How are your professionals verified?',
    a: 'Every professional completes an ID and address check and is trained before taking their first job.',
  },
  {
    q: 'What if I am not satisfied with the work?',
    a: 'Not happy? We will come back and re-clean at no extra cost. Tell us within 24 hours of the visit.',
  },
  {
    q: 'How do I pay?',
    a: 'Pay after the work is done, by cash or UPI. The price you see when booking is the price you pay.',
  },
  {
    q: 'Can I reschedule or cancel a booking?',
    a: 'Yes. Reschedule or cancel from your account, or call us. There is no charge if you tell us before the professional sets out.',
  },
  {
    q: 'Which cities do you serve?',
    a: 'We currently operate in 14 cities. Pick your city at the top of the page to see availability.',
  },
]

export function Faq() {
  // One item open at a time, per the spec.
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Frequently asked questions</h2>
        <dl className="mt-10 divide-y divide-border border-y border-border">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q}>
                <dt>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left font-semibold"
                  >
                    {f.q}
                    {isOpen ? (
                      <Minus className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </dt>
                {isOpen && (
                  <dd className="pb-6 pr-10 text-muted-foreground">{f.a}</dd>
                )}
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}

/* ── 12. CTA band + partner panel ─────────────────────────────────────────── */

export function CtaBanner() {
  return (
    <section className="bg-primary px-4 py-16 text-primary-foreground sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready when you are</h2>
          <p className="mt-3 max-w-lg text-primary-foreground/80">
            Book a deep clean for the weekend, or get a helper to your door within the hour.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/deep-cleaning"
              className="rounded-2xl bg-background px-6 py-3.5 font-semibold text-primary transition-opacity hover:opacity-90"
            >
              Book a deep clean
            </Link>
            <Link
              href="/prime-now"
              className="rounded-2xl border border-primary-foreground/30 px-6 py-3.5 font-semibold transition-colors hover:bg-white/10"
            >
              Get help now
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-ink p-6 text-ink-foreground">
          <p className="label-mono text-brand">For professionals</p>
          <h3 className="mt-3 text-xl font-bold">Become a Prime Partner</h3>
          <p className="mt-2 text-sm text-ink-foreground/70">
            Steady work in your city, paid on time, on your own schedule.
          </p>
          <Link
            href="/become-partner"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 font-bold text-brand-foreground transition-opacity hover:opacity-90"
          >
            Apply to join <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── 14. Floating WhatsApp ────────────────────────────────────────────────── */

export function FloatingButtons() {
  return (
    <a
      href={WHATSAPP}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      // z-40 keeps it under the cart drawer / modals but over page content.
      className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-ink text-ink-foreground shadow-panel transition-transform hover:scale-105"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Phone, Star, ArrowRight, CheckCircle, Shield, Clock, ThumbsUp,
  ChevronLeft, ChevronRight, LocateFixed, Loader2, MapPin,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCity } from '@/lib/city-context'
import { BLOG_POSTS } from '@/lib/blog-data'

// ─── Hero ─────────────────────────────────────────────────────────────────────

export function HeroSection() {
  const { setCartOpen } = useCart()
  const { city, detectCity, detecting, detectMessage, detectError } = useCity()

  return (
    <section className="relative overflow-hidden bg-linear-to-br from-primary/5 via-white to-accent/5 py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 leading-tight">
              Professional Services<br />
              <span className="text-primary">at Your Doorstep</span>
            </h1>
            <p className="text-lg text-gray-500 mb-6">
              Home deep cleaning by BHK, residential & corporate cleaning, pest control and more —
              trusted by 1 million+ happy customers across India.
            </p>

            {/* Location */}
            <div className="mb-8 rounded-2xl border border-primary/15 bg-white/70 backdrop-blur p-4">
              <div className="flex flex-wrap items-center gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-gray-600">
                  {city ? (
                    <>Serving <strong className="text-gray-900">{city}</strong></>
                  ) : (
                    'Where do you need the service?'
                  )}
                </span>
                <button
                  onClick={detectCity}
                  disabled={detecting}
                  className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                  {detecting ? 'Detecting…' : city ? 'Change' : 'Detect my location'}
                </button>
              </div>
              {detectMessage && <p className="mt-2 text-xs text-green-600">{detectMessage}</p>}
              {detectError && <p className="mt-2 text-xs text-red-500">{detectError}</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setCartOpen(true)}
                className="bg-accent text-white px-8 py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/30 hover:scale-105 text-base"
              >
                Book Now
              </button>
              <a
                href="#services"
                className="flex items-center justify-center gap-2 border-2 border-primary text-primary px-8 py-3.5 rounded-xl font-bold hover:bg-primary hover:text-white transition-all text-base"
              >
                Explore Services <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="w-full h-96 rounded-3xl overflow-hidden border border-primary/10 shadow-2xl">
              <img src="/Office%20cleaning%20PC.jpg" alt="Professional cleaning team" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-5 py-3 border border-gray-100">
              <p className="text-xs text-gray-500">Happy customers</p>
              <p className="text-primary font-black text-2xl">1M+</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Why us ───────────────────────────────────────────────────────────────────

const WHY_US = [
  { Icon: CheckCircle, title: 'Verified Professionals', desc: 'All our staff are background-checked and professionally trained.' },
  { Icon: Shield, title: 'Satisfaction Guaranteed', desc: 'Not happy? We will come back and re-clean at no extra cost.' },
  { Icon: Clock, title: 'On-Time Service', desc: 'We respect your time and always arrive on schedule.' },
  { Icon: ThumbsUp, title: 'Eco-Friendly Products', desc: 'Safe cleaning agents that protect your family and the environment.' },
]

export function WhyUs() {
  return (
    <section id="why-us" className="py-16 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-primary/5 to-accent/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Why Choose MyPrimeCompany?</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            India&apos;s most trusted professional cleaning and facility services partner
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WHY_US.map((item) => (
            <div key={item.title} className="bg-white rounded-2xl p-6 hover:shadow-xl transition-all border border-gray-100 hover:border-primary/20 text-center group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                <item.Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

const GALLERY = [
  { label: 'Residential Clean', src: '/Sofa%20Shampooing%20PC.jpg' },
  { label: 'Commercial Clean', src: '/Office%20cleaning%20PC.jpg' },
  { label: 'Pest Control', src: '/Living%20area%20Pest%20PC.jpg' },
  { label: 'Marble Polish', src: '/marble%20polishing%20PC.jpg' },
]

export function Gallery() {
  return (
    <section id="gallery" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Our Work</h2>
          <p className="text-gray-500 mt-2">Real results from our professional cleaning team</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {GALLERY.map((cat) => (
            <div key={cat.label} className="group relative rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all aspect-[3/4]">
              <img src={cat.src} alt={cat.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-bold text-sm md:text-base">{cat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { name: 'Abhi A', rating: 5, text: 'I had booked a deep cleaning service with MyPrimeCompany for my flat. The team was meticulous. Really appreciate the quick response time and professionalism.' },
  { name: 'Dibyabharati Mohapatra', rating: 5, text: 'Every time we booked MyPrimeCompany for deep cleaning, they do an excellent job and are very punctual. I would recommend them to everyone.' },
  { name: 'Vijaya Lakshmi', rating: 5, text: 'I booked a window and sofa cleaning service, and the experience was excellent. Big thanks to the MyPrimeCompany team for their outstanding work!' },
  { name: 'Sherry Wasandi', rating: 5, text: 'I availed deep cleaning services recently and was very impressed. The team worked extremely diligently, exceeding expectations. Strongly recommending them.' },
  { name: 'Prateek Sharma', rating: 5, text: 'I recently got my sofa cleaned, and I am extremely satisfied! The team was punctual, professional, and did a thorough job. My sofa looks and smells fresh.' },
  { name: 'Deepti Krishnan', rating: 5, text: 'Wonderful job! Upholstery and carpets were well cleaned. We have been using MyPrimeCompany for a while now and highly recommend.' },
]

export function Testimonials() {
  const [current, setCurrent] = useState(0)
  const total = TESTIMONIALS.length
  const t = TESTIMONIALS[current]

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Top Testimonials</h2>
          <p className="text-gray-500 mt-2">What our customers say about us</p>
        </div>

        <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg">
          <div className="flex gap-1 mb-4 justify-center">
            {Array(t.rating).fill(0).map((_, j) => (
              <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-gray-600 text-base leading-relaxed mb-6 italic text-center">&ldquo;{t.text}&rdquo;</p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">{t.name[0]}</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{t.name}</p>
              <p className="text-xs text-gray-400">Verified Customer</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6">
          <button onClick={() => setCurrent((c) => (c - 1 + total) % total)} aria-label="Previous" className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-primary hover:text-primary transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Testimonial ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-primary scale-125' : 'bg-gray-300'}`} />
            ))}
          </div>
          <button onClick={() => setCurrent((c) => (c + 1) % total)} aria-label="Next" className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-primary hover:text-primary transition-all shadow-sm">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Blog preview ─────────────────────────────────────────────────────────────

export function BlogPreview() {
  return (
    <section id="blog" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Cleaning Tips &amp; Guides</h2>
            <p className="text-gray-500 mt-2 max-w-xl">Expert insights, practical tips and the latest updates.</p>
          </div>
          <Link href="/blog" className="flex items-center gap-1 text-primary font-semibold text-sm hover:underline shrink-0">
            View All Posts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOG_POSTS.slice(0, 3).map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all">
              <div className="h-44 overflow-hidden">
                <img src={post.img} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">{post.category}</span>
                  <span className="text-xs text-gray-400">{post.date}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                <span className="mt-4 text-xs font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read More <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export function Clients() {
  const CLIENTS = [
    { src: '/viatris.webp', alt: 'Viatris' },
    { src: '/mylan.webp', alt: 'Mylan' },
    { src: '/LaurusBio_Black.png', alt: 'Laurus Bio' },
    { src: '/primeeagle.jpeg', alt: 'Prime Eagle' },
  ]
  return (
    <section id="clients" className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Our Clients</h2>
        <p className="text-gray-500 text-sm mb-8">Proud to partner with industry leaders and trusted brands</p>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {CLIENTS.map((c) => (
            <div key={c.alt} className="bg-white rounded-xl border border-gray-100 px-6 py-4 hover:border-primary/30 hover:shadow-md transition-all flex items-center justify-center" style={{ minWidth: '140px', height: '80px' }}>
              <img src={c.src} alt={c.alt} className="max-h-12 max-w-[120px] object-contain grayscale hover:grayscale-0 transition-all" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

export function CtaBanner() {
  const { setCartOpen } = useCart()
  return (
    <section id="contact-cta" className="py-16 px-4 sm:px-6 lg:px-8 bg-primary text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4">Ready for a Spotless Home?</h2>
        <p className="text-white/80 mb-8 text-lg">Book your service today and experience the MyPrimeCompany difference.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => setCartOpen(true)} className="bg-accent text-white px-8 py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg text-base hover:scale-105">
            Book Now
          </button>
          <a href="tel:+917349603429" className="flex items-center justify-center gap-2 bg-white/20 text-white border-2 border-white/30 px-8 py-3.5 rounded-xl font-bold hover:bg-white/30 transition-all text-base">
            <Phone className="w-4 h-4" /> +91 73496 03429
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Floating buttons ─────────────────────────────────────────────────────────

export function FloatingButtons() {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
      <a href="https://wa.me/917349603429" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
         className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform" style={{ backgroundColor: '#25D366' }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-7 h-7 fill-white">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.469 2.027 7.773L0 32l8.437-2.013A15.938 15.938 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 0 1-6.773-1.853l-.486-.289-5.007 1.195 1.219-4.879-.317-.502A13.267 13.267 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.307-9.907c-.4-.2-2.368-1.168-2.735-1.301-.367-.133-.634-.2-.9.2-.267.4-1.034 1.301-1.267 1.568-.233.267-.467.3-.867.1-.4-.2-1.688-.622-3.215-1.983-1.188-1.06-1.99-2.37-2.223-2.77-.233-.4-.025-.616.175-.815.18-.18.4-.467.6-.7.2-.233.267-.4.4-.667.133-.267.067-.5-.033-.7-.1-.2-.9-2.168-1.234-2.968-.325-.78-.655-.674-.9-.686l-.767-.013c-.267 0-.7.1-1.067.5-.367.4-1.4 1.368-1.4 3.335s1.433 3.868 1.633 4.135c.2.267 2.82 4.305 6.832 6.035.955.413 1.7.659 2.282.843.958.305 1.831.262 2.52.159.769-.115 2.368-.968 2.702-1.903.333-.935.333-1.735.233-1.903-.1-.167-.367-.267-.767-.467z" />
        </svg>
      </a>
      <a href="tel:+917349603429" aria-label="Call us" className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
        <Phone className="w-6 h-6 text-white" />
      </a>
    </div>
  )
}

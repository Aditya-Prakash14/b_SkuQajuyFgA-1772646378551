'use client'

import { useState } from 'react'
import {
  Phone, Menu, X, Star, MapPin, ChevronDown, ShoppingCart,
  Facebook, Twitter, Instagram, Linkedin, Youtube, ArrowRight,
  CheckCircle, Shield, Clock, ThumbsUp,
  Sparkles, Paintbrush, Building2, Droplets, Gem, Bug, Users, Mail, ShoppingBag, Settings,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'

// ─── Data ────────────────────────────────────────────────────────────────────

const CITIES = [
  'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai',
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Bhubaneswar', 'Gurgaon', 'Noida',
]

const SERVICE_CATEGORIES = [
  { name: 'Residential Cleaning',     Icon: Sparkles   },
  { name: 'Commercial Cleaning',      Icon: Building2  },
  { name: 'Pest Control',             Icon: Bug        },
  { name: 'Marble Polishing',         Icon: Gem        },
  { name: 'Custom Cleaning Service',  Icon: Settings   },
]

const POPULAR_SERVICES = [
  // ── House Deep Cleaning ──
  { name: 'Home Deep Cleaning',             slug: 'home-deep-cleaning',     price: 1499, priceStr: '₹1,499', img: '/fan%20cleaning%20PC.jpg' },
  { name: 'Bathroom Deep Cleaning',         slug: 'bathroom-cleaning',      price: 599,  priceStr: '₹599',   img: '/bathroom%20fixures%20Cleaning%20PC.jpg' },
  { name: 'Sofa Shampooing',                slug: 'sofa-shampooing',        price: 799,  priceStr: '₹799',   img: '/Sofa%20Shampooing%20PC.jpg' },
  { name: 'Fridge Deep Cleaning',           slug: '',                       price: 499,  priceStr: '₹499',   img: '/fridge%20cleaning%20PC.jpg' },
  { name: 'Kitchen Deep Cleaning',          slug: 'kitchen-cleaning',       price: 899,  priceStr: '₹899',   img: '/Kitchen%20Sink%20cleaning%20PC.jpg' },
  { name: 'Carpet Deep Cleaning',           slug: 'carpet-shampooing',      price: 499,  priceStr: '₹499',   img: '/Carpet%20cleaning%20PC.jpg' },
  { name: 'Chimney Deep Cleaning',          slug: '',                       price: 599,  priceStr: '₹599',   img: '/chimney%20cleaning%20PC.jpg' },
  { name: 'Window Deep Cleaning',           slug: 'window-cleaning',        price: 599,  priceStr: '₹599',   img: '/window%20interior%20cleaning%20PC.jpg' },
  { name: 'Marble Polishing',               slug: 'marble-floor-polishing', price: 999,  priceStr: '₹999',   img: '/marble%20polishing%20PC.jpg' },
  { name: 'Dining Table & Chair Cleaning',  slug: '',                       price: 499,  priceStr: '₹499',   img: '/dining%20table%20cleaning%20PC.jpg' },
  // ── Commercial Cleaning ──
  { name: 'New Office Deep Cleaning',       slug: 'office-deep-cleaning',   price: 2999, priceStr: '₹2,999', img: '/Office%20cleaning%20PC.jpg' },
  { name: 'Running Office Deep Cleaning',   slug: '',                       price: 1999, priceStr: '₹1,999', img: '/Office%20Interior%20glass%20PC.jpg' },
  { name: 'Chair Cleaning',                 slug: '',                       price: 299,  priceStr: '₹299',   img: '/Office%20chair%20PC.jpg' },
  { name: 'Carpet Cleaning (Shampoo)',      slug: 'carpet-shampooing',      price: 499,  priceStr: '₹499',   img: '/Carpet%20cleaning%20PC.jpg' },
  { name: 'Glass Cleaning',                 slug: '',                       price: 599,  priceStr: '₹599',   img: '/glass%20cleaning%20PC.jpg' },
  // ── Pest Control ──
  { name: 'General Pest Control',           slug: 'pest-control',           price: 999,  priceStr: '₹999',   img: '/Living%20area%20Pest%20PC.jpg' },
  { name: 'Bed Bugs Control',               slug: 'bed-bugs-treatment',     price: 1999, priceStr: '₹1,999', img: '/mattress%20cleaning%20PC.jpg' },
  { name: 'Pest Control AMC',               slug: '',                       price: 1999, priceStr: '₹1,999', img: '/Pest%20control%20in%20Office%20PC.jpg' },
]

const FEATURED_SERVICES = POPULAR_SERVICES.slice(0, 12)

const TESTIMONIALS = [
  {
    name: 'Abhi A',
    rating: 5,
    text: 'I had booked a deep cleaning service with Prime Home Care for my flat. The team was meticulous in cleaning up the house. Really appreciate the quick response time & professionalism.',
  },
  {
    name: 'Dibyabharati Mohapatra',
    rating: 5,
    text: 'Every time we booked Prime Home Care for deep cleaning, they do an excellent job and are very punctual. I would recommend them to everyone.',
  },
  {
    name: 'Vijaya Lakshmi',
    rating: 5,
    text: 'I booked a window and sofa cleaning service, and the experience was excellent. Big thanks to the Prime Home Care team for their outstanding work!',
  },
  {
    name: 'Sherry Wasandi',
    rating: 5,
    text: "I availed deep cleaning services from Prime Home Care recently, and was very impressed with their work. The team worked extremely diligently, exceeding expectations. Strongly recommending them.",
  },
  {
    name: 'Prateek Sharma',
    rating: 5,
    text: "I recently got my sofa cleaned by Prime Home Care, and I'm extremely satisfied! The team was punctual, professional, and did a thorough job. My sofa looks and smells fresh—just like new.",
  },
  {
    name: 'Deepti Krishnan',
    rating: 5,
    text: "Wonderful job! Upholstery and carpets were well cleaned. We've been using Prime Home Care's services for a while now and highly recommend.",
  },
]

const BLOG_POSTS = [
  { title: 'Marble Polishing Services: Signs Your Marble Floor Needs Polishing',    date: '02 Mar', category: 'Marble Polishing', img: '/marble%20polishing%20PC.jpg' },
  { title: 'Premium Home Deep Cleaning | Book Now',                                 date: '06 Jul', category: 'Deep Cleaning',    img: '/Office%20cleaning%20PC.jpg' },
  { title: 'Sofa Cleaning and Shampooing Services',                                 date: '10 Jul', category: 'Sofa Cleaning',    img: '/Sofa%20Shampooing%20PC.jpg' },
  { title: 'Why Every Busy Family Needs a Professional House Cleaning Service',     date: '05 Nov', category: 'House Cleaning',   img: '/Switch%20board%20cleaning%20PC.jpg' },
  { title: 'Affordable Carpet & Upholstery Cleaning: Stress-Free Weekends',        date: '18 Nov', category: 'Cleaning Tips',    img: '/Carpet%20cleaning%20PC.jpg' },
  { title: 'How Professional Pest Control Services Help Protect Your Home',         date: '19 Nov', category: 'Pest Control',     img: '/Living%20area%20Pest%20PC.jpg' },
]

const WHY_US = [
  { icon: <CheckCircle className="w-6 h-6" />, title: 'Verified Professionals',  desc: 'All our staff are background-checked and professionally trained.' },
  { icon: <Shield        className="w-6 h-6" />, title: 'Satisfaction Guaranteed', desc: "Not happy? We'll come back and re-clean at no extra cost." },
  { icon: <Clock         className="w-6 h-6" />, title: 'On-Time Service',         desc: 'We respect your time and always arrive on schedule.' },
  { icon: <ThumbsUp      className="w-6 h-6" />, title: 'Eco-Friendly Products',   desc: 'Safe cleaning agents that protect your family and the environment.' },
]

// ─── FeaturedAddToCart (small inline button) ─────────────────────────────────

function FeaturedAddToCart({ svc }: { svc: { name: string; img: string; slug?: string; price: number; priceStr: string } }) {
  const { addToCart, cart } = useCart()
  const id = svc.slug || svc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const inCart = cart.some(c => c.id === id)
  return (
    <button
      onClick={() => addToCart({ id, name: svc.name, img: svc.img, price: svc.price, priceStr: svc.priceStr })}
      className={`w-full text-[11px] font-semibold py-1 rounded-lg transition-colors ${
        inCart ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
      }`}
    >
      {inCart ? 'Added' : '+ Add'}
    </button>
  )
}

// ─── ServiceCard component ────────────────────────────────────────────────────

function ServiceCard({ name, img, city, slug, price, priceStr }: { name: string; img: string; city: string; slug?: string; price: number; priceStr: string }) {
  const { addToCart, cart } = useCart()
  const id = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const inCart = cart.some(c => c.id === id)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    addToCart({ id, name, img, price, priceStr })
  }

  return (
    <div className="group shrink-0 w-48 bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
      {/* Image — links to detail page if slug exists */}
      {slug ? (
        <a href={`/services/${slug}`} className="block h-32 overflow-hidden">
          <img src={img} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </a>
      ) : (
        <div className="h-32 overflow-hidden">
          <img src={img} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      <div className="p-3">
        {slug ? (
          <a href={`/services/${slug}`}>
            <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 leading-snug hover:text-primary transition-colors">{name}</h3>
          </a>
        ) : (
          <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 leading-snug">{name}</h3>
        )}
        <p className="text-xs text-primary font-bold mb-1">{priceStr}</p>
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {city}
        </p>
        <button
          onClick={handleAdd}
          className={`w-full text-xs font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
            inCart
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          <ShoppingBag className="w-3 h-3" />
          {inCart ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}

// ─── Testimonials Slider ───────────────────────────────────────────────────────

function TestimonialsSlider() {
  const [current, setCurrent] = useState(0)
  const total = TESTIMONIALS.length
  const prev = () => setCurrent(c => (c - 1 + total) % total)
  const next = () => setCurrent(c => (c + 1) % total)
  const t = TESTIMONIALS[current]

  return (
    <section id="testimonials" className="py-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Top Testimonials</h2>
          <p className="text-gray-500 mt-2">What our customers say about us</p>
        </div>

        <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg">
          {/* Stars */}
          <div className="flex gap-1 mb-4 justify-center">
            {Array(t.rating).fill(0).map((_, j) => (
              <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>

          {/* Text */}
          <p className="text-gray-600 text-base leading-relaxed mb-6 italic text-center">
            &ldquo;{t.text}&rdquo;
          </p>

          {/* Author */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
              {t.name[0]}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{t.name}</p>
              <p className="text-xs text-gray-400">Verified Customer</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <button onClick={prev} className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-primary hover:text-primary transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-primary scale-125' : 'bg-gray-300'}`}
              />
            ))}
          </div>

          <button onClick={next} className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-primary hover:text-primary transition-all shadow-sm">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState('Select City')
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Residential Cleaning')
  const { totalItems, setCartOpen } = useCart()

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">

      {/* ── Announcement Bar ──────────────────────────────── */}
      <div className="bg-primary text-white text-xs sm:text-sm py-2 text-center px-4">
        <Phone className="w-3.5 h-3.5 inline-block mr-1" /> Call us anytime:{' '}
        <a href="tel:+917349603429" className="font-semibold hover:underline">+91 73496 03429</a>
        &nbsp;|&nbsp; Professional cleaning services across India
      </div>

      {/* ── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center shrink-0">
            <img
              src="/prime%20Home%20cleaning.svg"
              alt="Prime Home Care Logo"
              className="h-16 w-auto"
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <a href="#services" className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Services</a>
            <a href="#gallery"  className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Gallery</a>
            <a href="#why-us"    className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Why Us</a>
            <a href="#blog"      className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Blog</a>
            <a href="#contact"   className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Contact</a>
            <a href="#"          className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">Become Partner</a>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* City Selector */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary border border-gray-200 rounded-lg px-3 py-1.5 hover:border-primary/40 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span className="max-w-24 truncate">{selectedCity}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {cityDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 p-2 w-48 max-h-64 overflow-y-auto">
                  {CITIES.map(city => (
                    <button
                      key={city}
                      onClick={() => { setSelectedCity(city); setCityDropdownOpen(false) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setCartOpen(true)}
              className="hidden sm:flex relative text-gray-500 hover:text-primary transition-colors items-center"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            <a href="tel:+917349603429" className="hidden md:flex items-center gap-1.5 text-primary font-semibold text-sm">
              <Phone className="w-4 h-4" />
              +91 73496 03429
            </a>

            <button
              onClick={() => setCartOpen(true)}
              className="bg-accent text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-accent/90 transition-colors shadow-md shadow-accent/30 flex items-center gap-1.5"
            >
              {totalItems > 0 ? (
                <><ShoppingBag className="w-4 h-4" /> Cart ({totalItems})</>
              ) : 'Book Now'}
            </button>

            <button className="md:hidden text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-4 flex flex-col gap-3 bg-white">
            {['Services', 'Gallery', 'Why Us', 'Blog', 'Contact', 'Become Partner'].map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`}
                 className="text-gray-700 hover:text-primary transition-colors font-medium py-1"
                 onClick={() => setMobileMenuOpen(false)}>
                {link}
              </a>
            ))}
            <div className="flex gap-2 mt-2">
              <select
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
              >
                <option value="Select City">Select City</option>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary/5 via-white to-accent/5 py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left content */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 leading-tight">
                Professional Services<br />
                <span className="text-primary">at Your Doorstep</span>
              </h1>
              <p className="text-lg text-gray-500 mb-8">
                Pick the service you need today — trusted by 1 million+ happy customers across India.
              </p>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-8">
                {SERVICE_CATEGORIES.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      activeCategory === cat.name
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                    }`}
                  >
                    <cat.Icon className="w-4 h-4" /> {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button className="bg-accent text-white px-8 py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/30 hover:scale-105 text-base">
                  Book Now
                </button>
                <a href="tel:+917349603429"
                   className="flex items-center justify-center gap-2 border-2 border-primary text-primary px-8 py-3.5 rounded-xl font-bold hover:bg-primary hover:text-white transition-all text-base">
                  <Phone className="w-4 h-4" /> +91 73496 03429
                </a>
              </div>

              {/* Stats */}

            </div>

            {/* Right visual */}
            <div className="relative hidden lg:block">
              <div className="w-full h-96 rounded-3xl overflow-hidden border border-primary/10 shadow-2xl">
                <img
                  src="/Office%20cleaning%20PC.jpg"
                  alt="Professional cleaning team"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating badges */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-5 py-3 border border-gray-100">
                <p className="text-xs text-gray-500">Happy customers</p>
                <p className="text-primary font-black text-2xl">1M+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Most Popular Services ─────────────────────────── */}
      <section id="services" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Most Popular Services</h2>
              <p className="text-gray-500 mt-1">What do you need to find?</p>
            </div>
            <button className="hidden sm:flex items-center gap-1 text-primary font-semibold text-sm hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable row */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {POPULAR_SERVICES.map((svc, i) => (
              <ServiceCard key={i} {...svc} city={selectedCity === 'Select City' ? 'Your City' : selectedCity} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Services  ────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Featured Services</h2>
            <p className="text-gray-500 mt-2">Discover our premium offerings</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {FEATURED_SERVICES.map((svc, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all hover:-translate-y-1"
              >
                {svc.slug ? (
                  <a href={`/services/${svc.slug}`} className="block h-20 overflow-hidden">
                    <img src={svc.img} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </a>
                ) : (
                  <div className="h-20 overflow-hidden">
                    <img src={svc.img} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-3 text-center">
                  {svc.slug ? (
                    <a href={`/services/${svc.slug}`}>
                      <p className="text-xs font-semibold text-gray-700 group-hover:text-primary transition-colors leading-snug mb-1">{svc.name}</p>
                    </a>
                  ) : (
                    <p className="text-xs font-semibold text-gray-700 leading-snug mb-1">{svc.name}</p>
                  )}
                  <p className="text-xs font-bold text-accent mb-2">{svc.priceStr}</p>
                  <FeaturedAddToCart svc={svc} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Prime Home Care ────────────────────── */}
      <section id="why-us" className="py-16 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-primary/5 to-accent/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Why Choose Prime Home Care?</h2>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto">
              {"We're India's most trusted professional cleaning and facility services partner"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_US.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 hover:shadow-xl transition-all border border-gray-100 hover:border-primary/20 text-center group">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Work Gallery ──────────────────────────────── */}
      <section id="gallery" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Our Work</h2>
            <p className="text-gray-500 mt-2">Real results from our professional cleaning team</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Residential Clean',
                src: '/Sofa%20Shampooing%20PC.jpg',
                alt: 'Residential Cleaning',
                images: [
                  '/Sofa%20Shampooing%20PC.jpg',
                  '/mattress%20cleaning%20PC.jpg',
                  '/Curtain%20cleaning%20PC.jpg',
                  '/fan%20cleaning%20PC.jpg',
                ],
              },
              {
                label: 'Commercial Clean',
                src: '/Office%20cleaning%20PC.jpg',
                alt: 'Commercial Cleaning',
                images: [
                  '/Office%20cleaning%20PC.jpg',
                  '/Office%20Floor%20PC.jpg',
                  '/Office%20chair%20PC.jpg',
                  '/office%20table%20PC.jpg',
                ],
              },
              {
                label: 'Pest Control',
                src: '/Living%20area%20Pest%20PC.jpg',
                alt: 'Pest Control',
                images: [
                  '/Living%20area%20Pest%20PC.jpg',
                  '/Pest%20control%20in%20Office%20PC.jpg',
                  '/pest%20control%20kitchen%20PC.jpg',
                ],
              },
              {
                label: 'Marble Polish',
                src: '/marble%20polishing%20PC.jpg',
                alt: 'Marble Polishing',
                images: [
                  '/marble%20polishing%20PC.jpg',
                  '/floor%20polishing%20PC.jpg',
                ],
              },
            ].map((cat, i) => (
              <div key={i} className="group relative rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all cursor-pointer aspect-[3/4]">
                <img
                  src={cat.src}
                  alt={cat.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-bold text-sm md:text-base">{cat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <TestimonialsSlider />

      {/* ── Blog / Tips Section ───────────────────────────── */}
      <section id="blog" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                Cleaning Tips, Trends &amp;<br className="hidden sm:block" /> Service Guides from Our Experts
              </h2>
              <p className="text-gray-500 mt-2 max-w-xl">
                Stay informed with expert insights, practical cleaning tips, and the latest updates.
              </p>
            </div>
            <button className="flex items-center gap-1 text-primary font-semibold text-sm hover:underline shrink-0">
              View All Posts <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post, i) => (
              <article
                key={i}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer"
              >
                <div className="h-44 overflow-hidden">
                  <img src={post.img} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-400">Prime Home Care &bull; {post.date}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <button className="mt-4 text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                    Read More <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Clients ───────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Our Clients</h2>
          <p className="text-gray-500 text-sm mb-8">We are proud to partner with industry leaders and trusted brands</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {[
              { src: '/viatris.webp',         alt: 'Viatris' },
              { src: '/mylan.webp',            alt: 'Mylan' },
              { src: '/LaurusBio_Black.png',   alt: 'Laurus Bio' },
              { src: '/primeeagle.jpeg',        alt: 'Prime Eagle' },
            ].map(client => (
              <div key={client.alt} className="bg-white rounded-xl border border-gray-100 px-6 py-4 hover:border-primary/30 hover:shadow-md transition-all flex items-center justify-center" style={{ minWidth: '140px', height: '80px' }}>
                <img src={client.src} alt={client.alt} className="max-h-12 max-w-[120px] object-contain grayscale hover:grayscale-0 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────── */}
      <section id="contact" className="py-16 px-4 sm:px-6 lg:px-8 bg-primary text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Ready for a Spotless Home?</h2>
          <p className="text-white/80 mb-8 text-lg">
            Book your service today and experience the Prime Home Care difference. Satisfaction guaranteed!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-accent text-white px-8 py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg text-base hover:scale-105">
              Book Now
            </button>
            <a href="tel:+917349603429"
               className="flex items-center justify-center gap-2 bg-white/20 text-white border-2 border-white/30 px-8 py-3.5 rounded-xl font-bold hover:bg-white/30 transition-all text-base">
              <Phone className="w-4 h-4" /> +91 73496 03429
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <img
                  src="/prime%20Home%20cleaning.svg"
                  alt="Prime Home Care Logo"
                  className="h-16 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                {"We are an organisation that cares about our people and our clients — To be the most admired cleaning and facility services partner in India."}
              </p>
              <div className="flex gap-3">
                {[
                  { icon: <Facebook  className="w-4 h-4" />, label: 'Facebook'  },
                  { icon: <Twitter   className="w-4 h-4" />, label: 'Twitter'   },
                  { icon: <Instagram className="w-4 h-4" />, label: 'Instagram' },
                  { icon: <Linkedin  className="w-4 h-4" />, label: 'LinkedIn'  },
                  { icon: <Youtube   className="w-4 h-4" />, label: 'YouTube'   },
                ].map(s => (
                  <a key={s.label} href="#" aria-label={s.label}
                     className="w-8 h-8 bg-gray-800 hover:bg-primary rounded-lg flex items-center justify-center transition-colors">
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* About */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">About</h4>
              <ul className="space-y-2.5 text-sm">
                {['About Us', 'Contact Us', 'Service', 'Client', 'Blog', 'Apply For Job', 'Become Partner'].map(l => (
                  <li key={l}><a href="#" className="hover:text-primary transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Additional Links */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Additional Links</h4>
              <ul className="space-y-2.5 text-sm">
                {['Home', 'Services', 'Privacy Policy', 'Terms & Conditions', 'Refund Policy', 'FAQ'].map(l => (
                  <li key={l}><a href="#" className="hover:text-primary transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <a href="tel:+917349603429" className="hover:text-primary transition-colors">+91 73496 03429</a>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <a href="mailto:info@primehomecare.in" className="hover:text-primary transition-colors">info@primehomecare.in</a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Bharadwaj Park, Balson Chauraha, Prayagraj, Uttar Pradesh</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-500">
            Copyright 2025 © Prime Home Care. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}

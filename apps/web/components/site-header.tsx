'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Phone, Menu, X, MapPin, ChevronDown, ShoppingCart, ShoppingBag,
  LocateFixed, Loader2, LogOut, User as UserIcon,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCity } from '@/lib/city-context'
import { useAuth } from '@/lib/auth-context'

const NAV = [
  { href: '/services', label: 'Services' },
  { href: '/#gallery', label: 'Gallery' },
  { href: '/#why-us', label: 'Why Us' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
  { href: '/become-partner', label: 'Become Partner' },
]

export function SiteHeader() {
  const { totalItems, setCartOpen } = useCart()
  const { city, setCity, cities, detectCity, detecting, detectMessage, detectError } = useCity()
  const { user, displayName, signInWithGoogle, signOut } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const cityRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <>
      {/* Announcement */}
      <div className="bg-primary text-white text-xs sm:text-sm py-2 text-center px-4">
        <Phone className="w-3.5 h-3.5 inline-block mr-1" /> Call us anytime:{' '}
        <a href="tel:+917349603429" className="font-semibold hover:underline">+91 73496 03429</a>
        &nbsp;|&nbsp; Professional cleaning services across India
      </div>

      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0">
            <img src="/prime%20Home%20cleaning.svg" alt="MyPrimeCompany" className="h-14 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-gray-600 hover:text-primary transition-colors text-sm font-medium">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* City selector with geolocation */}
            <div className="relative hidden sm:block" ref={cityRef}>
              <button
                onClick={() => setCityOpen((v) => !v)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary border border-gray-200 rounded-lg px-3 py-1.5 hover:border-primary/40 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span className="max-w-24 truncate">{city ?? 'Select City'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {cityOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 p-2 w-64">
                  <button
                    onClick={detectCity}
                    disabled={detecting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                    {detecting ? 'Detecting…' : 'Use my current location'}
                  </button>

                  {detectMessage && <p className="px-3 py-1.5 text-[11px] text-green-600">{detectMessage}</p>}
                  {detectError && <p className="px-3 py-1.5 text-[11px] text-red-500">{detectError}</p>}

                  <div className="my-1 border-t border-gray-100" />
                  <div className="max-h-56 overflow-y-auto">
                    {cities.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCity(c); setCityOpen(false) }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                          c === city ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-gray-50'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Auth */}
            {user ? (
              <div className="relative hidden sm:block" ref={userRef}>
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5 hover:border-primary/40 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                    {displayName.charAt(0).toUpperCase() || <UserIcon className="w-3 h-3" />}
                  </span>
                  <span className="max-w-20 truncate text-gray-700">{displayName}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {userOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 p-2 w-56">
                    <p className="px-3 py-1.5 text-xs text-gray-500 truncate">{user.email}</p>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={() => { signOut(); setUserOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle(typeof window !== 'undefined' ? window.location.pathname : '/')}
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors"
              >
                <GoogleMark /> Sign in
              </button>
            )}

            <button onClick={() => setCartOpen(true)} className="hidden sm:flex relative text-gray-500 hover:text-primary transition-colors items-center">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setCartOpen(true)}
              className="bg-accent text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-accent/90 transition-colors shadow-md shadow-accent/30 flex items-center gap-1.5"
            >
              {totalItems > 0 ? (<><ShoppingBag className="w-4 h-4" /> Cart ({totalItems})</>) : 'Book Now'}
            </button>

            <button className="lg:hidden text-gray-600" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 px-4 py-4 flex flex-col gap-3 bg-white">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="text-gray-700 hover:text-primary font-medium py-1">
                {n.label}
              </Link>
            ))}

            <button
              onClick={detectCity}
              disabled={detecting}
              className="flex items-center gap-2 text-sm font-semibold text-primary py-1"
            >
              {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              {detecting ? 'Detecting…' : 'Use my current location'}
            </button>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
              value={city ?? ''}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="" disabled>Select City</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {detectError && <p className="text-[11px] text-red-500">{detectError}</p>}

            {user ? (
              <button onClick={() => signOut()} className="flex items-center gap-2 text-sm text-red-600 py-1">
                <LogOut className="w-4 h-4" /> Sign out ({displayName})
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle('/')}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 py-1"
              >
                <GoogleMark /> Sign in with Google
              </button>
            )}
          </div>
        )}
      </header>
    </>
  )
}

export function GoogleMark({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.9z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.26a12 12 0 0 0 0 10.74l4.01-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

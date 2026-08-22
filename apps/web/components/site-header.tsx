'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Phone, Menu, X, MapPin, ChevronDown, ShoppingCart, ShoppingBag,
  LocateFixed, Loader2, LogOut, User as UserIcon, CalendarClock,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCity } from '@/lib/city-context'
import { useAuth } from '@/lib/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// The site has exactly two business domains; everything else is secondary.
const NAV = [
  { href: '/deep-cleaning', label: 'Deep Cleaning' },
  { href: '/prime-now', label: 'Prime Now' },
  { href: '/#gallery', label: 'Gallery' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  const { totalItems, setCartOpen } = useCart()
  const { city, setCity, cities, detectCity, detecting, detectMessage, detectError } = useCity()
  const { user, displayName, signInWithGoogle, signOut } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Announcement */}
      <div className="bg-primary px-4 py-2 text-center text-xs text-primary-foreground sm:text-sm">
        <Phone className="mr-1 inline-block h-3.5 w-3.5" /> Call us anytime:{' '}
        <a href="tel:+917349603429" className="font-semibold hover:underline">+91 73496 03429</a>
        &nbsp;|&nbsp; Professional cleaning services across India
      </div>

      <header className="sticky top-0 z-50 border-b bg-background shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="My Prime Company home">
            <span className="flex h-10 w-[4.5rem] items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
              <Image src="/logo.png" alt="PC monogram" width={64} height={30} priority className="h-8 w-auto" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tight text-foreground">My Prime Company</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Home &amp; Office Care</span>
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {/* City selector with geolocation */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden gap-1 font-normal text-muted-foreground sm:flex">
                  <MapPin className="size-4" />
                  <span className="max-w-24 truncate">{city ?? 'Select City'}</span>
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem
                  disabled={detecting}
                  onSelect={(e) => {
                    e.preventDefault() // keep the menu open while detecting
                    detectCity()
                  }}
                  className="font-semibold text-primary focus:text-primary"
                >
                  {detecting ? <Loader2 className="animate-spin" /> : <LocateFixed />}
                  {detecting ? 'Detecting…' : 'Use my current location'}
                </DropdownMenuItem>

                {detectMessage && <p className="px-2 py-1.5 text-[11px] text-emerald-600">{detectMessage}</p>}
                {detectError && <p className="px-2 py-1.5 text-[11px] text-destructive">{detectError}</p>}

                <DropdownMenuSeparator />
                <ScrollArea className="h-56">
                  {cities.map((c) => (
                    <DropdownMenuItem
                      key={c}
                      onSelect={() => setCity(c)}
                      className={cn(c === city && 'bg-primary/10 font-semibold text-primary focus:text-primary')}
                    >
                      {c}
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auth */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden gap-1.5 px-2 font-normal sm:flex">
                    <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {displayName.charAt(0).toUpperCase() || <UserIcon className="size-3" />}
                    </span>
                    <span className="max-w-20 truncate">{displayName}</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <CalendarClock /> My bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                onClick={() => signInWithGoogle(typeof window !== 'undefined' ? window.location.pathname : '/')}
                className="hidden gap-1.5 font-semibold sm:flex"
              >
                <GoogleMark /> Sign in
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              className="relative hidden text-muted-foreground hover:text-primary sm:inline-flex"
            >
              <ShoppingCart className="size-5" />
              {totalItems > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 size-4 justify-center rounded-full bg-brand p-0 text-[10px] font-bold text-brand-foreground">
                  {totalItems > 9 ? '9+' : totalItems}
                </Badge>
              )}
            </Button>

            <Button
              variant="brand"
              onClick={() => setCartOpen(true)}
              className="rounded-xl font-bold shadow-md shadow-brand/30"
            >
              {totalItems > 0 ? (<><ShoppingBag /> Cart ({totalItems})</>) : 'Book Now'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-[22px]" /> : <Menu className="size-[22px]" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="flex flex-col gap-3 border-t bg-background px-4 py-4 lg:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="py-1 font-medium text-foreground hover:text-primary">
                {n.label}
              </Link>
            ))}

            <Button
              variant="link"
              onClick={detectCity}
              disabled={detecting}
              className="h-auto justify-start gap-2 p-0 py-1 text-sm font-semibold"
            >
              {detecting ? <Loader2 className="animate-spin" /> : <LocateFixed />}
              {detecting ? 'Detecting…' : 'Use my current location'}
            </Button>
            <Select value={city ?? undefined} onValueChange={setCity}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {detectError && <p className="text-[11px] text-destructive">{detectError}</p>}

            {user ? (
              <>
                <Link href="/account" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-1 text-sm font-medium text-foreground hover:text-primary">
                  <CalendarClock className="size-4" /> My bookings
                </Link>
                <Button
                  variant="link"
                  onClick={() => signOut()}
                  className="h-auto justify-start gap-2 p-0 py-1 text-sm text-destructive"
                >
                  <LogOut /> Sign out ({displayName})
                </Button>
              </>
            ) : (
              <Button
                variant="link"
                onClick={() => signInWithGoogle('/')}
                className="h-auto justify-start gap-2 p-0 py-1 text-sm font-semibold text-foreground"
              >
                <GoogleMark /> Sign in with Google
              </Button>
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

import Link from 'next/link'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

const COMPANY = [
  { href: '/about', label: 'About us' },
  { href: '/careers', label: 'Careers' },
  { href: '/blog', label: 'Blog' },
  { href: '/become-partner', label: 'Become a Prime Partner' },
]

const QUICK = [
  { href: '/deep-cleaning', label: 'Deep Cleaning' },
  { href: '/prime-now', label: 'Prime Now' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refund-policy', label: 'Refund policy' },
]

export function SiteFooter() {
  return (
    <footer className="bg-ink px-4 py-14 text-ink-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="text-lg font-extrabold">My Prime Company</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-foreground/60">
              Professional cleaning and facility services for homes and offices across India.
              1M+ customers served.
            </p>
          </div>

          <nav aria-label="Company">
            <p className="label-mono text-brand">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {COMPANY.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ink-foreground/70 transition-colors hover:text-ink-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Quick links">
            <p className="label-mono text-brand">Quick links</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {QUICK.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ink-foreground/70 transition-colors hover:text-ink-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="label-mono text-brand">Contact</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="tel:+917349603429" className="flex items-start gap-2.5 text-ink-foreground/70 transition-colors hover:text-ink-foreground">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0" /> +91 73496 03429
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/917349603429"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-ink-foreground/70 transition-colors hover:text-ink-foreground"
                >
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" /> WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:support@myprimecompany.in" className="flex items-start gap-2.5 text-ink-foreground/70 transition-colors hover:text-ink-foreground">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" /> support@myprimecompany.in
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-ink-foreground/70">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  HSR Layout Sector 4, 17th Main B Cross,
                  <br />
                  Bangalore, Karnataka 560102
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-ink-foreground/50">
          © {new Date().getFullYear()} My Prime Company. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

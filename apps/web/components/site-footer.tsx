import Link from 'next/link'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

const ABOUT_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/services', label: 'Services' },
  { href: '/#clients', label: 'Our Clients' },
  { href: '/blog', label: 'Blog' },
  { href: '/careers', label: 'Apply For Job' },
  { href: '/become-partner', label: 'Become Partner' },
]

const MORE_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'All Services' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/faq', label: 'FAQ' },
]

export function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4" aria-label="MyPrimeCompany home">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white font-black text-lg">M</span>
              <span className="flex flex-col leading-none">
                <span className="font-black text-lg text-white tracking-tight">MyPrimeCompany</span>
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mt-0.5">Home &amp; Office Care</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              We are an organisation that cares about our people and our clients — to be the most
              admired cleaning and facility services partner in India.
            </p>
            <div className="flex gap-3">
              <a
                href="https://wa.me/917349603429"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 bg-gray-800 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="tel:+917349603429" aria-label="Call" className="w-9 h-9 bg-gray-800 hover:bg-primary rounded-lg flex items-center justify-center transition-colors">
                <Phone className="w-4 h-4" />
              </a>
              <a href="mailto:support@myprimecompany.in" aria-label="Email" className="w-9 h-9 bg-gray-800 hover:bg-primary rounded-lg flex items-center justify-center transition-colors">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-sm">
              {ABOUT_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-primary transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {MORE_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-primary transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <a href="tel:+917349603429" className="hover:text-primary transition-colors">+91 73496 03429</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <a href="mailto:support@myprimecompany.in" className="hover:text-primary transition-colors">support@myprimecompany.in</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Bharadwaj Park, Balson Chauraha, Prayagraj, Uttar Pradesh</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} MyPrimeCompany. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

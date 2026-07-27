import type { Metadata } from 'next'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { PageShell, PageHero } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'Contact Us | MyPrimeCompany',
  description: 'Call, WhatsApp or email MyPrimeCompany. We respond to every enquiry the same day.',
}

const CHANNELS = [
  {
    Icon: Phone,
    title: 'Call us',
    value: '+91 73496 03429',
    href: 'tel:+917349603429',
    note: 'Fastest way to reach us — 7 days a week',
  },
  {
    Icon: MessageCircle,
    title: 'WhatsApp',
    value: 'Chat with us',
    href: 'https://wa.me/917349603429',
    note: 'Send photos of the space for an accurate quote',
  },
  {
    Icon: Mail,
    title: 'Email',
    value: 'support@myprimecompany.in',
    href: 'mailto:support@myprimecompany.in',
    note: 'For corporate contracts and AMC enquiries',
  },
]

export default function ContactPage() {
  return (
    <PageShell>
      <PageHero
        title="Contact Us"
        subtitle="Questions, quotes or corporate contracts — reach us on whichever channel suits you."
      />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            {CHANNELS.map((c) => (
              <a
                key={c.title}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group bg-white border border-gray-100 rounded-2xl p-6 text-center hover:shadow-xl hover:border-primary/30 transition-all"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                  <c.Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900">{c.title}</h3>
                <p className="text-primary font-semibold mt-1">{c.value}</p>
                <p className="text-xs text-gray-400 mt-2">{c.note}</p>
              </a>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Registered office
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                MyPrimeCompany<br />
                Bharadwaj Park, Balson Chauraha<br />
                Prayagraj, Uttar Pradesh, India
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Service hours
              </h3>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex justify-between"><span>Monday – Saturday</span><span className="font-medium">8:00 AM – 8:00 PM</span></li>
                <li className="flex justify-between"><span>Sunday</span><span className="font-medium">9:00 AM – 6:00 PM</span></li>
                <li className="flex justify-between"><span>Corporate (after-hours)</span><span className="font-medium">On request</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}

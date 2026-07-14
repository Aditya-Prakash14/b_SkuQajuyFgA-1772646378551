import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell, PageHero } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'FAQ | MyPrimeCompany',
  description: 'Frequently asked questions about booking, pricing, warranty and our cleaning services.',
}

const FAQS: { q: string; a: string }[] = [
  { q: 'How do I book a service?', a: 'Add the services you need to the cart, sign in with Google, then fill in your address and preferred date. You will get an order number immediately on confirmation.' },
  { q: 'Why do I have to sign in to book?', a: 'Signing in links the booking to you securely, lets us protect your personal details, and gives you a verifiable record of every order you place.' },
  { q: 'Which BHK package should I choose?', a: 'Pick the package that matches your home size — 1, 2, 3 or 4 BHK / Villa. If your home is unusually large or has extra rooms, call us and we will advise the right fit.' },
  { q: 'Do I need to provide any equipment or supplies?', a: 'No. Our team brings all equipment, machines and cleaning agents. We only need access to water and a power socket.' },
  { q: 'Are the cleaning products safe for children and pets?', a: 'Yes. We use eco-friendly, non-toxic agents, and food-safe cleaners on all food-contact surfaces in the kitchen.' },
  { q: 'How many professionals will come?', a: 'It depends on the job — typically 2 for a 1 BHK deep clean and 4 to 6 for a villa. The exact crew is confirmed when your booking is assigned.' },
  { q: 'What is your service warranty?', a: 'If you are not satisfied, tell us within 48 hours and we will return and re-clean the affected areas at no extra cost.' },
  { q: 'Can I cancel or reschedule?', a: 'Yes — free of charge up to 12 hours before your slot. Later cancellations may attract a fee. See our Refund Policy for details.' },
  { q: 'Which cities do you serve?', a: 'We currently operate in 12 cities including Bangalore, Mumbai, Delhi, Hyderabad, Pune, Chennai, Kolkata, Ahmedabad, Jaipur, Bhubaneswar, Gurgaon and Noida. Use "detect my location" to find your nearest city.' },
  { q: 'Do you take corporate or AMC contracts?', a: 'Yes. We handle office deep cleaning, facade cleaning and annual maintenance contracts. Email info@primehomecare.in for a proposal.' },
]

export default function FaqPage() {
  return (
    <PageShell>
      <PageHero title="Frequently Asked Questions" subtitle="Everything you need to know about booking and our services." />

      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((f) => (
            <details key={f.q} className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-primary/20 transition-colors">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between gap-4">
                {f.q}
                <span className="text-primary text-xl leading-none shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">{f.a}</p>
            </details>
          ))}

          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 text-center mt-8">
            <p className="text-sm text-gray-600">
              Still have a question?{' '}
              <Link href="/contact" className="text-primary font-semibold hover:underline">Contact us →</Link>
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  )
}

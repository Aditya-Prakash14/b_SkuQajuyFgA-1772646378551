import type { Metadata } from 'next'
import { BadgeCheck, CalendarCheck, IndianRupee, Wrench } from 'lucide-react'
import { PageShell, PageHero } from '@/components/page-shell'
import { PartnerForm } from '@/components/partner-form'

export const metadata: Metadata = {
  title: 'Become a Partner | MyPrimeCompany',
  description: 'Join the MyPrimeCompany vendor network. Steady work, on-time payouts and a growing customer base across 12 cities.',
}

const BENEFITS = [
  { Icon: CalendarCheck, title: 'Steady work', desc: 'A consistent pipeline of jobs in your city — no chasing leads.' },
  { Icon: IndianRupee, title: 'On-time payouts', desc: 'Transparent commission and reliable settlement cycles.' },
  { Icon: Wrench, title: 'Equipment support', desc: 'Access to professional-grade equipment and consumables.' },
  { Icon: BadgeCheck, title: 'Verified badge', desc: 'Get listed as a background-verified MyPrimeCompany partner.' },
]

export default function BecomePartnerPage() {
  return (
    <PageShell>
      <PageHero
        title="Become a Partner"
        subtitle="Join our vendor network and grow your cleaning or pest-control business with a steady flow of customers."
      />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Why partner with us</h2>
            <div className="space-y-4">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <b.Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{b.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/10 p-5">
              <h3 className="font-bold text-gray-900 mb-2 text-sm">What happens next</h3>
              <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>You submit the application form.</li>
                <li>Our onboarding team calls you within 2–3 working days.</li>
                <li>We verify your documents and ID.</li>
                <li>You are activated and start receiving jobs in your city.</li>
              </ol>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Apply now</h2>
            <PartnerForm />
          </div>
        </div>
      </section>
    </PageShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, Shield, Sparkles, Users } from 'lucide-react'
import { PageShell, PageHero } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'About Us | MyPrimeCompany',
  description: 'MyPrimeCompany is a professional cleaning and facility services company serving homes and offices across India.',
}

const STATS = [
  { value: '1M+', label: 'Happy customers' },
  { value: '12', label: 'Cities served' },
  { value: '20+', label: 'Services offered' },
  { value: '4.8★', label: 'Average rating' },
]

const VALUES = [
  { Icon: Shield, title: 'Trust first', desc: 'Every professional on our team is background-verified and trained before they enter your home.' },
  { Icon: Sparkles, title: 'Craft, not shortcuts', desc: 'We use professional equipment and the right chemistry for each surface — never a one-size-fits-all spray.' },
  { Icon: Users, title: 'People we care for', desc: 'Fair pay, safety gear and steady work for our field partners. Good outcomes start with treating people well.' },
  { Icon: CheckCircle, title: 'Accountable', desc: 'If the result is not right, we come back and redo it within 48 hours at no cost.' },
]

export default function AboutPage() {
  return (
    <PageShell>
      <PageHero
        title="About MyPrimeCompany"
        subtitle="A professional cleaning and facility services partner for homes and businesses across India."
      />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">Who we are</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                MyPrimeCompany began with a simple observation: most people do not dislike cleaning —
                they dislike doing it badly, with the wrong tools, in the little time they have.
              </p>
              <p>
                We built a company around doing it properly. Trained crews, professional-grade equipment,
                eco-friendly agents that are safe around children and pets, and a service warranty that
                means what it says.
              </p>
              <p>
                Today we deliver home deep cleaning by BHK size, residential and corporate cleaning,
                pest control, marble polishing, painting and disinfection across twelve Indian cities —
                for households and for enterprise clients alike.
              </p>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
            <img src="/Office%20cleaning%20PC.jpg" alt="Our cleaning team at work" className="w-full h-80 object-cover" />
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-black text-primary">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">What we stand for</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <v.Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{v.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/services" className="inline-block bg-brand text-white px-8 py-3.5 rounded-xl font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/30">
              Explore our services
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  )
}

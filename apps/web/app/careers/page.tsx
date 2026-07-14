import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageCircle } from 'lucide-react'
import { PageShell, PageHero } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'Careers | MyPrimeCompany',
  description: 'Work with MyPrimeCompany — field technicians, supervisors and operations roles across 12 Indian cities.',
}

const ROLES = [
  { title: 'Cleaning Technician', type: 'Full-time · Field', desc: 'Deliver residential and commercial deep-cleaning jobs. Training and equipment provided.' },
  { title: 'Pest Control Technician', type: 'Full-time · Field', desc: 'Certified treatments for general pest, termite and bed-bug control. Licence support provided.' },
  { title: 'Field Supervisor', type: 'Full-time · City ops', desc: 'Own quality and scheduling for a crew of 8–12 technicians in your city.' },
  { title: 'Customer Support Executive', type: 'Full-time · Office', desc: 'Handle bookings, scheduling and customer follow-ups over call and WhatsApp.' },
]

export default function CareersPage() {
  return (
    <PageShell>
      <PageHero
        title="Careers"
        subtitle="Fair pay, proper training, safety gear and steady work. Build a career in professional facility services."
      />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Open roles</h2>
          <div className="space-y-4">
            {ROLES.map((r) => (
              <div key={r.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-primary/20 transition-all">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h3 className="font-bold text-gray-900">{r.title}</h3>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">{r.type}</span>
                </div>
                <p className="text-sm text-gray-500">{r.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-gray-50 border border-gray-100 p-8 text-center">
            <h3 className="font-black text-gray-900 text-lg">How to apply</h3>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              Send your details on WhatsApp or email — mention the role and your city. We respond within 3 working days.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://wa.me/917349603429"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Apply on WhatsApp
              </a>
              <a
                href="mailto:info@primehomecare.in?subject=Job%20Application"
                className="inline-flex items-center justify-center gap-2 border-2 border-primary text-primary px-6 py-3 rounded-xl font-bold hover:bg-primary hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4" /> Email your CV
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              Run a cleaning business already?{' '}
              <Link href="/become-partner" className="text-primary font-semibold hover:underline">Become a partner instead →</Link>
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  )
}

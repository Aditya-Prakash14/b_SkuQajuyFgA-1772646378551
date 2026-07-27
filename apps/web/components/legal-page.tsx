import { PageShell, PageHero } from '@/components/page-shell'

export interface LegalSection {
  heading: string
  paras: string[]
}

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <PageShell>
      <PageHero title={title} subtitle={intro} />
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-gray-400 mb-8">Last updated: {updated}</p>
          <div className="space-y-8">
            {sections.map((s) => (
              <div key={s.heading}>
                <h2 className="text-lg font-black text-gray-900 mb-3">{s.heading}</h2>
                <div className="space-y-3 text-gray-600 leading-relaxed text-sm">
                  {s.paras.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-gray-50 border border-gray-100 p-6 text-sm text-gray-600">
            Questions about this policy? Email{' '}
            <a href="mailto:support@myprimecompany.in" className="text-primary font-semibold hover:underline">
              support@myprimecompany.in
            </a>{' '}
            or call{' '}
            <a href="tel:+917349603429" className="text-primary font-semibold hover:underline">
              +91 73496 03429
            </a>
            .
          </div>
        </div>
      </section>
    </PageShell>
  )
}

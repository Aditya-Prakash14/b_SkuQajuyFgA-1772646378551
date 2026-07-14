import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { FloatingButtons } from '@/components/home-sections'

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingButtons />
    </div>
  )
}

export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="bg-linear-to-br from-primary/10 via-white to-accent/5 border-b border-gray-100 py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-3 text-lg max-w-2xl mx-auto">{subtitle}</p>}
      </div>
    </section>
  )
}

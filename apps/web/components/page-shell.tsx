import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { FloatingButtons } from '@/components/home-sections'

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingButtons />
    </div>
  )
}

/** Plain page header — the spec allows no gradients, so this is flat tint on a rule. */
export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="border-b border-border bg-secondary/50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-extrabold md:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </section>
  )
}

/** Breadcrumb that returns to the category, never to a flat service index. */
export function Breadcrumbs({ trail }: { trail: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
      {trail.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-2">
          {i > 0 && <span className="text-muted-foreground/50">/</span>}
          {c.href ? (
            <a href={c.href} className="text-muted-foreground transition-colors hover:text-primary">
              {c.label}
            </a>
          ) : (
            <span className="font-medium text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

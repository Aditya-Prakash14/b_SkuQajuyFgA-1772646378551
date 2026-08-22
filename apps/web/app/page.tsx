import { PageShell } from '@/components/page-shell'
import {
  Clients,
  CtaBanner,
  DomainCards,
  Faq,
  Gallery,
  HeroSection,
  HowItWorks,
  Testimonials,
  TrustStrip,
  WhyUs,
} from '@/components/home-sections'

/**
 * The homepage presents exactly two business domains and never lists individual
 * services — browsing happens one level down, at /deep-cleaning.
 */
export default function Page() {
  return (
    <PageShell>
      <HeroSection />
      <TrustStrip />
      <DomainCards />
      <HowItWorks />
      <WhyUs />
      <Gallery />
      <Testimonials />
      <Clients />
      <Faq />
      <CtaBanner />
    </PageShell>
  )
}

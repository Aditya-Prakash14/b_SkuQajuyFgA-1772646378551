import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ServicesExplorer } from '@/components/services-explorer'
import {
  HeroSection, WhyUs, Gallery, Testimonials, BlogPreview, Clients, CtaBanner, FloatingButtons,
} from '@/components/home-sections'
import { getAllServices, getServiceCategories } from '@/lib/services-data'

// ISR — CRM catalog edits appear within this window.
export const revalidate = 300

export default async function Page() {
  const [services, categories] = await Promise.all([getAllServices(), getServiceCategories()])

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <SiteHeader />
      <HeroSection />
      <ServicesExplorer
        services={services}
        categories={categories}
        heading="Our Services"
        subheading="Browse by category — from BHK deep-cleaning packages to corporate contracts"
      />
      <WhyUs />
      <Gallery />
      <Testimonials />
      <BlogPreview />
      <Clients />
      <CtaBanner />
      <SiteFooter />
      <FloatingButtons />
    </div>
  )
}

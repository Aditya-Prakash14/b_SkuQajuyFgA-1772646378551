import type { Metadata } from 'next'
import { PageShell, PageHero } from '@/components/page-shell'
import { ServicesExplorer } from '@/components/services-explorer'
import { getAllServices, getServiceCategories } from '@/lib/services-data'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'All Services | MyPrimeCompany',
  description:
    'Browse every MyPrimeCompany service by category — BHK home deep cleaning, residential cleaning, corporate & commercial, pest control, marble polishing, painting and disinfection.',
}

export default async function AllServicesPage() {
  const [services, categories] = await Promise.all([getAllServices(), getServiceCategories()])

  return (
    <PageShell>
      <PageHero
        title="All Services"
        subtitle="Every service we offer, organised by category. Add what you need to the cart and book in minutes."
      />
      <ServicesExplorer
        services={services}
        categories={categories}
        heading="Browse the catalog"
        subheading="Filter by category to find exactly what your home or office needs"
      />
    </PageShell>
  )
}

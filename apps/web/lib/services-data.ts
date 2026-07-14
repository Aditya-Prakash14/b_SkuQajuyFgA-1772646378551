import { createPublicClient } from '@/lib/supabase/public'

// Shape the marketing pages render (mapped from the Supabase `services` row).
export interface Service {
  id: string
  slug: string
  name: string
  tagline: string
  category: string
  heroImg: string
  galleryImgs: string[]
  price: string // display label, e.g. "₹1,499" or "₹7 / sq. ft."
  duration: string
  rating: number
  reviews: number
  bookings: string
  description: string
  whatWeClean: string[]
  howItWorks: { step: number; title: string; desc: string }[]
  whatsIncluded: string[]
  notIncluded: string[]
  faqs: { q: string; a: string }[]
  relatedIds: string[]
}

const SELECT =
  'id,slug,name,tagline,hero_img,gallery_imgs,display_price_label,duration,rating,reviews_count,bookings_count,description,what_we_clean,how_it_works,whats_included,not_included,faqs,related_service_ids,category:service_categories(name)'

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapService(row: any): Service {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? '',
    category: row.category?.name ?? '',
    heroImg: row.hero_img ?? '',
    galleryImgs: row.gallery_imgs ?? [],
    price: row.display_price_label ?? '',
    duration: row.duration ?? '',
    rating: Number(row.rating ?? 0),
    reviews: row.reviews_count ?? 0,
    bookings: row.bookings_count ?? '',
    description: row.description ?? '',
    whatWeClean: row.what_we_clean ?? [],
    howItWorks: row.how_it_works ?? [],
    whatsIncluded: row.whats_included ?? [],
    notIncluded: row.not_included ?? [],
    faqs: row.faqs ?? [],
    relatedIds: row.related_service_ids ?? [],
  }
}

/** Service card shape used across the site (homepage, /services, cart). */
export interface HomeService {
  id: string
  slug: string
  name: string
  price: number
  priceStr: string
  img: string
  category: string
  tagline: string
  duration: string
}

export interface HomeCategory {
  name: string
  slug: string
  icon: string | null
}

export async function getAllServices(): Promise<HomeService[]> {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('services')
    .select(
      'id,slug,name,price,display_price_label,hero_img,tagline,duration,category:service_categories(name,sort_order)',
    )
    .eq('is_active', true)
    .order('name')

  return ((data as any[]) ?? [])
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      price: Number(s.price),
      priceStr: s.display_price_label ?? '',
      img: s.hero_img ?? '',
      category: s.category?.name ?? 'Other',
      tagline: s.tagline ?? '',
      duration: s.duration ?? '',
      _sort: s.category?.sort_order ?? 99,
    }))
    // group by category order, then alphabetically inside a category
    .sort((a, b) => a._sort - b._sort || a.name.localeCompare(b.name))
    .map(({ _sort, ...rest }) => rest)
}

export async function getServiceCategories(): Promise<HomeCategory[]> {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('service_categories')
    .select('name,slug,icon')
    .order('sort_order')
  return (data as any[]) ?? []
}

export async function getCities(): Promise<string[]> {
  const supabase = createPublicClient()
  const { data } = await supabase.from('cities').select('name').eq('is_active', true).order('name')
  return ((data as any[]) ?? []).map((c) => c.name)
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const supabase = createPublicClient()
  const { data } = await supabase.from('services').select(SELECT).eq('slug', slug).eq('is_active', true).maybeSingle()
  return data ? mapService(data) : null
}

export async function getRelatedServices(ids: string[]): Promise<Service[]> {
  if (!ids.length) return []
  const supabase = createPublicClient()
  const { data } = await supabase.from('services').select(SELECT).in('id', ids).eq('is_active', true)
  return ((data as any[]) ?? []).map(mapService)
}

export async function getAllServiceSlugs(): Promise<string[]> {
  const supabase = createPublicClient()
  const { data } = await supabase.from('services').select('slug').eq('is_active', true)
  return ((data as any[]) ?? []).map((s) => s.slug)
}

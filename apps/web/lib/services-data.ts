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
  /** Numeric rate: the flat price, or the price of one unit. */
  rate: number
  /** 'fixed' | 'per_sqft' | 'per_panel' — drives the area input at checkout. */
  priceUnit: string
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
  'id,slug,name,tagline,hero_img,gallery_imgs,price,price_unit,display_price_label,duration,rating,reviews_count,bookings_count,description,what_we_clean,how_it_works,whats_included,not_included,faqs,related_service_ids,category:service_categories(name)'

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
    rate: Number(row.price ?? 0),
    priceUnit: row.price_unit ?? 'fixed',
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
  priceUnit: string
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
      'id,slug,name,price,price_unit,display_price_label,hero_img,tagline,duration,category:service_categories(name,sort_order)',
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
      priceUnit: s.price_unit ?? 'fixed',
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

export interface PublicReview {
  rating: number
  comment: string | null
  created_at: string | null
}

/** Public (world-readable) reviews for a service, newest first, comments only. */
export async function getServiceReviews(serviceId: string): Promise<PublicReview[]> {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('reviews')
    .select('rating,comment,created_at')
    .eq('service_id', serviceId)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)
  return (data as any[]) ?? []
}

// ── Deep Cleaning drill-down (level 1 → 2 → 3) ───────────────────────────────

/** A category card on /deep-cleaning: count, starting price and a photo. */
export interface CategoryCard {
  name: string
  slug: string
  serviceCount: number
  /** Lowest numeric price in the category, for the "From ₹x" line. */
  fromPrice: number
  /** Rendered exactly as the cheapest service shows it, e.g. "₹5 / sq. ft." */
  fromPriceLabel: string
  img: string
  tagline: string
}

/** The four (or more) category cards, in the CRM's own sort order. */
export async function getCategoryCards(): Promise<CategoryCard[]> {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('services')
    .select('name,price,display_price_label,hero_img,tagline,category:service_categories(name,slug,sort_order)')
    .eq('is_active', true)

  const byCategory = new Map<string, CategoryCard & { _sort: number }>()
  for (const s of ((data as any[]) ?? [])) {
    const cat = s.category
    if (!cat?.slug) continue
    const price = Number(s.price)
    const existing = byCategory.get(cat.slug)
    if (!existing) {
      byCategory.set(cat.slug, {
        name: cat.name,
        slug: cat.slug,
        serviceCount: 1,
        fromPrice: price,
        fromPriceLabel: s.display_price_label ?? '',
        img: s.hero_img ?? '',
        tagline: s.tagline ?? '',
        _sort: cat.sort_order ?? 99,
      })
      continue
    }
    existing.serviceCount += 1
    // Keep the cheapest service's own label so per-unit pricing stays truthful:
    // "₹5 / sq. ft." must never be flattened into a bare "₹5".
    if (price < existing.fromPrice) {
      existing.fromPrice = price
      existing.fromPriceLabel = s.display_price_label ?? ''
      existing.img = s.hero_img || existing.img
    }
  }

  return [...byCategory.values()]
    .sort((a, b) => a._sort - b._sort || a.name.localeCompare(b.name))
    .map(({ _sort, ...rest }) => rest)
}

export interface CategoryDetail {
  name: string
  slug: string
  services: HomeService[]
}

/** Level 2: one category and every service inside it, in one round trip. */
export async function getCategoryBySlug(slug: string): Promise<CategoryDetail | null> {
  const supabase = createPublicClient()
  // !inner turns the embed into a join so the category slug can filter services.
  const { data } = await supabase
    .from('services')
    .select(
      'id,slug,name,price,price_unit,display_price_label,hero_img,tagline,duration,category:service_categories!inner(name,slug)',
    )
    .eq('category.slug', slug)
    .eq('is_active', true)
    .order('price')

  const rows = (data as any[]) ?? []
  if (rows.length === 0) {
    // A category with no active services still has a valid page.
    const { data: cat } = await supabase
      .from('service_categories')
      .select('name,slug')
      .eq('slug', slug)
      .maybeSingle()
    return cat ? { name: (cat as any).name, slug: (cat as any).slug, services: [] } : null
  }

  return {
    name: rows[0].category.name,
    slug: rows[0].category.slug,
    services: rows.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      price: Number(s.price),
      priceStr: s.display_price_label ?? '',
      priceUnit: s.price_unit ?? 'fixed',
      img: s.hero_img ?? '',
      category: s.category?.name ?? '',
      tagline: s.tagline ?? '',
      duration: s.duration ?? '',
    })),
  }
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const supabase = createPublicClient()
  const { data } = await supabase.from('service_categories').select('slug').order('sort_order')
  return ((data as any[]) ?? []).map((c) => c.slug)
}

/** Breadcrumbs on a service page point at its category, not a flat index. */
export async function getServiceCategoryRef(
  serviceSlug: string,
): Promise<{ name: string; slug: string } | null> {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('services')
    .select('category:service_categories(name,slug)')
    .eq('slug', serviceSlug)
    .maybeSingle()
  const cat = (data as any)?.category
  return cat?.slug ? { name: cat.name, slug: cat.slug } : null
}

/** Level 3 "related": same category, excluding the service itself. */
export async function getCategorySiblings(
  categorySlug: string,
  excludeSlug: string,
  limit = 4,
): Promise<HomeService[]> {
  const cat = await getCategoryBySlug(categorySlug)
  if (!cat) return []
  return cat.services.filter((s) => s.slug !== excludeSlug).slice(0, limit)
}

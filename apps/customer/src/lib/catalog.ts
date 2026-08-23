import { cached } from './offline'
import { supabase } from './supabase'
import type { Category, PriceUnit, Review, Service } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The catalogue stores hero images as site-relative paths ('/fan cleaning.jpg')
 * because the website resolves them against its own origin. React Native has no
 * origin, so a relative path renders nothing — every image has to be absolute.
 */
const SITE_ORIGIN = 'https://www.myprimecompany.com'

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return SITE_ORIGIN + (path.startsWith('/') ? path : '/' + path)
}

/** The word after "per": "sq. ft.", "panel", "seat". Reads the label first, as the website does. */
export function unitWord(priceUnit: PriceUnit, priceLabel: string): string {
  const fromLabel = priceLabel.split(' / ')[1]
  if (fromLabel) return fromLabel
  if (priceUnit === 'per_panel') return 'panel'
  if (priceUnit === 'per_seat') return 'seat'
  return 'sq. ft.'
}

/**
 * Catalogue reads. All public (anon-readable, active rows only) — the same
 * data the website renders, so a price can never differ between the two.
 */

const SERVICE_FIELDS =
  'id,slug,name,tagline,description,duration,price,price_unit,display_price_label,hero_img,gallery_imgs,whats_included,what_we_clean,how_it_works,not_included,faqs,rating,reviews_count,category_id,category:service_categories(id,name,slug)'

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : []

function mapService(row: any): Service {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    categoryId: row.category_id,
    categoryName: row.category?.name ?? '',
    rate: Number(row.price ?? 0),
    priceUnit: (row.price_unit ?? 'fixed') as PriceUnit,
    priceLabel: row.display_price_label ?? '',
    duration: row.duration ?? '',
    image: imageUrl(row.hero_img),
    gallery: strings(row.gallery_imgs)
      .map(imageUrl)
      .filter((u): u is string => !!u),
    // The spec asks for six "What's included" items.
    includes: strings(row.whats_included).slice(0, 6),
    whatWeClean: strings(row.what_we_clean),
    howItWorks: Array.isArray(row.how_it_works)
      ? row.how_it_works
          .filter((s: any) => s && typeof s === 'object' && s.title)
          .map((s: any, i: number) => ({ step: s.step ?? i + 1, title: String(s.title), desc: String(s.desc ?? '') }))
      : [],
    notIncluded: strings(row.not_included),
    faqs: Array.isArray(row.faqs)
      ? row.faqs.filter((f: any) => f && f.q && f.a).map((f: any) => ({ q: String(f.q), a: String(f.a) }))
      : [],
    rating: Number(row.rating ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
  }
}

/** Deep Cleaning category rows: count, starting price and a photo. */
export function fetchCategories(): Promise<Category[]> {
  return cached('categories', async () => {
    const { data, error } = await supabase
      .from('services')
      .select('price,display_price_label,hero_img,category:service_categories!inner(id,name,slug,sort_order)')
      .eq('is_active', true)
    if (error) throw error

    const byId = new Map<string, Category & { _sort: number; _min: number }>()
    for (const row of (data as any[]) ?? []) {
      const cat = row.category
      if (!cat?.id) continue
      const price = Number(row.price)
      const existing = byId.get(cat.id)
      if (!existing) {
        byId.set(cat.id, {
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
          serviceCount: 1,
          fromPriceLabel: row.display_price_label ?? '',
          image: imageUrl(row.hero_img),
          _sort: cat.sort_order ?? 99,
          _min: price,
        })
        continue
      }
      existing.serviceCount += 1
      if (price < existing._min) {
        existing._min = price
        existing.fromPriceLabel = row.display_price_label ?? ''
        existing.image = imageUrl(row.hero_img) || existing.image
      }
    }

    return [...byId.values()]
      .sort((a, b) => a._sort - b._sort || a.name.localeCompare(b.name))
      .map(({ _sort, _min, ...rest }) => rest)
  })
}

export function fetchServicesInCategory(categoryId: string): Promise<Service[]> {
  return cached(`services.${categoryId}`, async () => {
    const { data, error } = await supabase
      .from('services')
      .select(SERVICE_FIELDS)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('price')
    if (error) throw error
    return ((data as any[]) ?? []).map(mapService)
  })
}

/** Every active service — loaded once for search, then filtered locally. */
export function fetchAllServices(): Promise<Service[]> {
  return cached('services.all', async () => {
    const { data, error } = await supabase.from('services').select(SERVICE_FIELDS).eq('is_active', true).order('name')
    if (error) throw error
    return ((data as any[]) ?? []).map(mapService)
  })
}

export function fetchService(id: string): Promise<Service | null> {
  return cached(`service.${id}`, async () => {
    const { data, error } = await supabase.from('services').select(SERVICE_FIELDS).eq('id', id).eq('is_active', true).maybeSingle()
    if (error) throw error
    return data ? mapService(data) : null
  })
}

/** Public reviews for a service, through the view that hides who wrote them. */
export async function fetchPublicReviews(serviceId: string, limit = 10): Promise<Review[]> {
  const { data, error } = await supabase
    .from('public_reviews')
    .select('id,rating,comment,created_at,reviewer')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data as Review[] | null) ?? []).map((r) => ({ ...r, rating: Number(r.rating) }))
}

/** Cities we operate in — gates the address step and Prime Now availability. */
export function fetchCities(): Promise<string[]> {
  return cached('cities', async () => {
    const { data, error } = await supabase.from('cities').select('name').eq('is_active', true).order('name')
    if (error) throw error
    return ((data as any[]) ?? []).map((c) => c.name)
  })
}

/** Case-insensitive match on name, tagline and category. Short queries match prefixes only. */
export function searchServices(all: Service[], query: string): Service[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return all.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.tagline.toLowerCase().includes(q) ||
      s.categoryName.toLowerCase().includes(q),
  )
}

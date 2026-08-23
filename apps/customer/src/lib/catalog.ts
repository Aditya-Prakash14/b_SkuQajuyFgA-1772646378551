import { supabase } from './supabase'
import type { Category, Service } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Catalogue reads. All public (anon-readable, active rows only) — the same
 * data the website renders, so a price can never differ between the two.
 */

const SERVICE_FIELDS =
  'id,slug,name,tagline,description,duration,price,price_unit,display_price_label,hero_img,whats_included,rating,reviews_count,category_id,category:service_categories(id,name,slug)'

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
    priceUnit: (row.price_unit ?? 'fixed') as Service['priceUnit'],
    priceLabel: row.display_price_label ?? '',
    duration: row.duration ?? '',
    image: row.hero_img ?? null,
    // The spec asks for six "What's included" items.
    includes: Array.isArray(row.whats_included) ? row.whats_included.slice(0, 6) : [],
    rating: Number(row.rating ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
  }
}

/** Deep Cleaning category rows: count, starting price and a photo. */
export async function fetchCategories(): Promise<Category[]> {
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
        image: row.hero_img ?? null,
        _sort: cat.sort_order ?? 99,
        _min: price,
      })
      continue
    }
    existing.serviceCount += 1
    if (price < existing._min) {
      existing._min = price
      existing.fromPriceLabel = row.display_price_label ?? ''
      existing.image = row.hero_img || existing.image
    }
  }

  return [...byId.values()]
    .sort((a, b) => a._sort - b._sort || a.name.localeCompare(b.name))
    .map(({ _sort, _min, ...rest }) => rest)
}

export async function fetchServicesInCategory(categoryId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_FIELDS)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('price')
  if (error) throw error
  return ((data as any[]) ?? []).map(mapService)
}

export async function fetchService(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_FIELDS)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data ? mapService(data) : null
}

/** Cities we operate in — gates the address step and Prime Now availability. */
export async function fetchCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('name')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return ((data as any[]) ?? []).map((c) => c.name)
}

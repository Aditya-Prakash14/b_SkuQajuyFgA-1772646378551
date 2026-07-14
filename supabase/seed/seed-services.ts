/**
 * Seed the `services` table from the marketing site's original hardcoded data.
 *
 *   pnpm seed            (from repo root)
 *   pnpm --filter @prime/supabase-seed seed
 *
 * Requires env (supabase/seed/.env or repo-root .env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← service role: bypasses RLS. NEVER ship to a client.
 *
 * Idempotent: upserts by `slug`, so re-running updates in place.
 *
 * NOTE: this imports the site's current hardcoded SERVICES array as the seed
 * source. When Phase 11 refactors apps/web/lib/services-data.ts to read from
 * Supabase, relocate this import (e.g. freeze a copy here) so the seed still runs.
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import type { Database, PriceUnit, TablesInsert } from '@prime/shared'
import { SERVICES } from '../../apps/web/lib/services-data'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    '✗ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
      '(supabase/seed/.env or repo-root .env).',
  )
  process.exit(1)
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Category display name → slug/icon/sort_order (mirrors reference-data.sql so the
// script is self-sufficient even if that SQL wasn't run first).
const CATEGORY_META: Record<string, { slug: string; icon: string; sort: number }> = {
  'Deep Cleaning': { slug: 'deep-cleaning', icon: 'Sparkles', sort: 1 },
  'Corporate Services': { slug: 'corporate-services', icon: 'Building2', sort: 2 },
  'Pest Control': { slug: 'pest-control', icon: 'Bug', sort: 3 },
  'Marble & Floor Polishing': { slug: 'marble-floor-polishing', icon: 'Gem', sort: 4 },
  Painting: { slug: 'painting', icon: 'Paintbrush', sort: 5 },
  Disinfection: { slug: 'disinfection', icon: 'Droplets', sort: 6 },
}

/** "₹1,499" → { price: 1499, unit: 'fixed' } ; "₹7 / sq. ft." → { 7, 'per_sqft' } */
function parsePrice(label: string): { price: number; unit: PriceUnit } {
  const price = parseFloat(label.replace(/[^\d.]/g, '')) || 0
  const l = label.toLowerCase()
  let unit: PriceUnit = 'fixed'
  if (l.includes('sq. ft') || l.includes('sq.ft') || l.includes('sq. yd')) unit = 'per_sqft'
  else if (l.includes('panel')) unit = 'per_panel'
  else if (l.includes('seat')) unit = 'per_seat'
  return { price, unit }
}

async function upsertCategories(): Promise<Map<string, string>> {
  const rows = Object.entries(CATEGORY_META).map(([name, m]) => ({
    name,
    slug: m.slug,
    icon: m.icon,
    sort_order: m.sort,
  }))
  const { error } = await supabase.from('service_categories').upsert(rows, { onConflict: 'slug' })
  if (error) throw new Error(`categories upsert failed: ${error.message}`)

  const { data, error: readErr } = await supabase.from('service_categories').select('id,name')
  if (readErr) throw new Error(`categories read failed: ${readErr.message}`)
  return new Map((data ?? []).map((c) => [c.name, c.id]))
}

async function main() {
  console.log(`→ Seeding ${SERVICES.length} services into ${url}`)
  const catByName = await upsertCategories()
  console.log(`  categories ready (${catByName.size})`)

  // Pass 1 — upsert every service (without related_service_ids; slugs → ids need all rows first)
  const rows: TablesInsert<'services'>[] = SERVICES.map((s) => {
    const { price, unit } = parsePrice(s.price)
    const category_id = catByName.get(s.category) ?? null
    if (!category_id) console.warn(`  ! no category match for "${s.category}" (service ${s.slug})`)
    return {
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      category_id,
      price,
      price_unit: unit,
      display_price_label: s.price,
      duration: s.duration,
      hero_img: s.heroImg,
      gallery_imgs: s.galleryImgs,
      description: s.description,
      what_we_clean: s.whatWeClean,
      how_it_works: s.howItWorks,
      whats_included: s.whatsIncluded,
      not_included: s.notIncluded,
      faqs: s.faqs,
      rating: s.rating,
      reviews_count: s.reviews,
      bookings_count: s.bookings,
      is_active: true,
    }
  })

  const { error: upErr } = await supabase.from('services').upsert(rows, { onConflict: 'slug' })
  if (upErr) throw new Error(`services upsert failed: ${upErr.message}`)
  console.log(`  upserted ${rows.length} services`)

  // Pass 2 — resolve relatedSlugs → related_service_ids
  const { data: all, error: allErr } = await supabase.from('services').select('id,slug')
  if (allErr) throw new Error(`services read failed: ${allErr.message}`)
  const idBySlug = new Map((all ?? []).map((r) => [r.slug, r.id]))

  for (const s of SERVICES) {
    const related = s.relatedSlugs
      .map((slug) => idBySlug.get(slug))
      .filter((id): id is string => Boolean(id))
    const { error } = await supabase
      .from('services')
      .update({ related_service_ids: related })
      .eq('slug', s.slug)
    if (error) throw new Error(`related update failed for ${s.slug}: ${error.message}`)
  }
  console.log('  linked related services')
  console.log('✓ Seed complete')
}

main().catch((e) => {
  console.error('✗ Seed failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})

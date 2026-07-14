'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { HowItWorksStep, Faq, PriceUnit, TablesInsert, Json } from '@prime/shared'

export interface ServiceInput {
  slug: string
  name: string
  tagline: string | null
  category_id: string | null
  price: number
  price_unit: PriceUnit
  display_price_label: string | null
  duration: string | null
  hero_img: string | null
  gallery_imgs: string[]
  description: string | null
  what_we_clean: string[]
  how_it_works: HowItWorksStep[]
  whats_included: string[]
  not_included: string[]
  faqs: Faq[]
  related_service_ids: string[]
  rating: number
  reviews_count: number
  bookings_count: string
  is_active: boolean
}

type Result = { error: string } | { ok: true }

function toRow(input: ServiceInput): TablesInsert<'services'> {
  return {
    slug: input.slug.trim(),
    name: input.name.trim(),
    tagline: input.tagline,
    category_id: input.category_id,
    price: input.price,
    price_unit: input.price_unit,
    display_price_label: input.display_price_label,
    duration: input.duration,
    hero_img: input.hero_img,
    gallery_imgs: input.gallery_imgs,
    description: input.description,
    what_we_clean: input.what_we_clean,
    // jsonb columns are typed as `Json` by the generated types; our richer
    // shapes are structurally compatible but need an explicit cast.
    how_it_works: input.how_it_works as unknown as Json,
    whats_included: input.whats_included,
    not_included: input.not_included,
    faqs: input.faqs as unknown as Json,
    related_service_ids: input.related_service_ids,
    rating: input.rating,
    reviews_count: input.reviews_count,
    bookings_count: input.bookings_count,
    is_active: input.is_active,
  }
}

export async function createService(input: ServiceInput): Promise<Result> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('services').insert(toRow(input)).select('id').single()
  if (error || !data) return { error: error?.message ?? 'Could not create service' }
  revalidatePath('/dashboard/services')
  redirect(`/dashboard/services/${data.id}`)
}

export async function updateService(id: string, input: ServiceInput): Promise<Result> {
  const supabase = await createClient()

  // Capture old price so we can record a price_history row on change.
  const { data: existing } = await supabase.from('services').select('price').eq('id', id).single()

  const { error } = await supabase.from('services').update(toRow(input)).eq('id', id)
  if (error) return { error: error.message }

  if (existing && Number(existing.price) !== Number(input.price)) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase.from('price_history').insert({
      service_id: id,
      old_price: existing.price,
      new_price: input.price,
      changed_by: user?.id ?? null,
    })
  }

  revalidatePath('/dashboard/services')
  revalidatePath(`/dashboard/services/${id}`)
  return { ok: true }
}

export async function toggleServiceActive(id: string, isActive: boolean): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('services').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/services')
  return { ok: true }
}

export async function deleteService(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) {
    // Most likely a FK from order_items — advise deactivating instead.
    return {
      error: error.message.includes('foreign key')
        ? 'This service is referenced by existing orders. Deactivate it instead of deleting.'
        : error.message,
    }
  }
  revalidatePath('/dashboard/services')
  redirect('/dashboard/services')
}

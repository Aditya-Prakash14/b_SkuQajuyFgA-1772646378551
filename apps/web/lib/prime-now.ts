import { createPublicClient } from '@/lib/supabase/public'

/**
 * Prime Now — instant house help by the hour.
 *
 * There is deliberately no catalogue: the customer picks how long they need
 * someone for, ticks what needs doing, and the request is dispatched. The
 * price list lives in prime_now_slots, edited from the CRM (0034); what is
 * shown here is display only — create_prime_now_request() prices the slot
 * again server-side from the same table, so a tampered browser cannot buy a
 * half day for ₹199.
 */

export type SlotId = string

export interface Slot {
  id: SlotId
  label: string
  sublabel: string
  price: number
  minutes: number
}

/** Shown only if the price list cannot be fetched (e.g. Supabase down). */
export const FALLBACK_SLOTS: Slot[] = [
  { id: '30m', label: '30 minutes', sublabel: 'A quick tidy-up', price: 199, minutes: 30 },
  { id: '1h', label: '1 hour', sublabel: 'Most popular', price: 349, minutes: 60 },
  { id: '90m', label: '90 minutes', sublabel: 'A thorough round', price: 499, minutes: 90 },
  { id: 'half_day', label: 'Half day', sublabel: '4 hours', price: 1199, minutes: 240 },
]

/** The live price list, CRM-controlled. Server-side (page) fetch. */
export async function getSlots(): Promise<Slot[]> {
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('prime_now_slots')
      .select('id,label,sublabel,minutes,price,is_active,sort_order')
      .eq('is_active', true)
      .order('sort_order')
    if (error || !data?.length) return FALLBACK_SLOTS
    return data.map((s) => ({
      id: s.id as string,
      label: s.label as string,
      sublabel: (s.sublabel as string) ?? '',
      minutes: Number(s.minutes),
      price: Number(s.price),
    }))
  } catch {
    return FALLBACK_SLOTS
  }
}

/** Chips are a convenience for the customer, not a taxonomy — the helper reads the list. */
export const TASKS: { id: string; label: string }[] = [
  { id: 'sweeping_mopping', label: 'Sweeping & mopping' },
  { id: 'utensils', label: 'Utensils & dishes' },
  { id: 'dusting', label: 'Dusting & wiping' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'ironing', label: 'Ironing & folding' },
  { id: 'kitchen_prep', label: 'Kitchen prep' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'fridge', label: 'Fridge' },
  { id: 'balcony', label: 'Balcony' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'party', label: 'Before or after a party' },
  { id: 'moving', label: 'Packing & moving help' },
  { id: 'other', label: 'Something else' },
]

export const TASK_LABEL: Record<string, string> = Object.fromEntries(
  TASKS.map((t) => [t.id, t.label]),
)

export const GUARANTEES = [
  { title: 'Background-verified helper', body: 'Every helper is ID-checked before their first job.' },
  { title: 'Flat hourly price', body: 'You pay the slot price. No travel fee, no surge.' },
  { title: 'Helper brings supplies', body: 'Cloths, brushes and basic cleaning liquid are included.' },
  { title: 'Free re-visit if unhappy', body: 'Not happy? We will come back and re-clean at no extra cost.' },
]

/** Shown as a fallback on the confirmation screen; never the booking channel. */
export const SUPPORT_PHONE = '917349603429'

export interface PrimeNowInput {
  name: string
  phone: string
  address: string
  city: string | null
  slot: SlotId
  tasks: string[]
  notes: string | null
  timing: 'now' | 'scheduled'
  scheduledFor: string | null
}

export interface PrimeNowResult {
  id: string
  request_number: string
  price: number
  minutes: number
}

/**
 * Record the request. This is the whole booking — there is no chat handoff:
 * the request lands in the CRM (Prime Now queue) and is dispatched from there,
 * so every job has one place it is managed and nothing depends on someone
 * reading a WhatsApp thread.
 */
export async function submitPrimeNowRequest(input: PrimeNowInput): Promise<PrimeNowResult> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('create_prime_now_request', {
    p_name: input.name,
    p_phone: input.phone,
    p_address: input.address,
    // The SQL does nullif(btrim(...), '') on these, so '' is stored as NULL.
    // PostgREST's generated arg types don't model nullability, hence the ?? ''.
    p_city: input.city ?? '',
    p_slot: input.slot,
    p_tasks: input.tasks,
    p_notes: input.notes ?? '',
    p_timing: input.timing,
    p_scheduled_for: input.scheduledFor ?? undefined,
  })
  if (error) throw error
  return data as unknown as PrimeNowResult
}

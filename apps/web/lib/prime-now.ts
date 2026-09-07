import {
  Boxes, BrushCleaning, CookingPot, DoorClosed, Ellipsis, Fence, PartyPopper,
  Refrigerator, Shirt, ShowerHead, SprayCan, UtensilsCrossed, WashingMachine,
  type LucideIcon,
} from 'lucide-react'
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

/**
 * Task cards are a convenience for the customer, not a taxonomy — the helper
 * reads the list. Icons mirror the customer app's Prime Now cards.
 */
export const TASKS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'sweeping_mopping', label: 'Sweeping & mopping', icon: BrushCleaning },
  { id: 'utensils', label: 'Utensils & dishes', icon: UtensilsCrossed },
  { id: 'dusting', label: 'Dusting & wiping', icon: SprayCan },
  { id: 'laundry', label: 'Laundry', icon: WashingMachine },
  { id: 'ironing', label: 'Ironing & folding', icon: Shirt },
  { id: 'kitchen_prep', label: 'Kitchen prep', icon: CookingPot },
  { id: 'bathroom', label: 'Bathroom', icon: ShowerHead },
  { id: 'fridge', label: 'Fridge', icon: Refrigerator },
  { id: 'balcony', label: 'Balcony', icon: Fence },
  { id: 'wardrobe', label: 'Wardrobe', icon: DoorClosed },
  { id: 'party', label: 'Before or after a party', icon: PartyPopper },
  { id: 'moving', label: 'Packing & moving help', icon: Boxes },
  { id: 'other', label: 'Something else', icon: Ellipsis },
]

export const TASK_LABEL: Record<string, string> = Object.fromEntries(
  TASKS.map((t) => [t.id, t.label]),
)

/** Scope of an hourly helper — shown as do / don't on the request page. */
export const HELPERS_DO = [
  'Everyday cleaning: sweeping, mopping, dusting and dishes',
  'Laundry, ironing and folding',
  'Kitchen prep and cleanup, before or after a party',
  'Bathroom, balcony, fridge and wardrobe tidy-ups',
  'Packing and moving help inside your home',
]

export const HELPERS_DONT = [
  'Outside window or ledge cleaning at height',
  'Moving very heavy furniture or appliances alone',
  'Childcare, elder care or pet care',
  'Electrical, plumbing, repairs or pest control — book those as scheduled services',
  'Driving or errands outside your home',
]

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

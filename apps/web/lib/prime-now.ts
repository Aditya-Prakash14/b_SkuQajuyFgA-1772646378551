import { createPublicClient } from '@/lib/supabase/public'

/**
 * Prime Now — instant house help by the hour.
 *
 * There is deliberately no catalogue: the customer picks how long they need
 * someone for, ticks what needs doing, and the request is dispatched. Prices
 * here are for display only — create_prime_now_request() prices the slot again
 * server-side, so a tampered browser cannot buy a half day for ₹199.
 */

export type SlotId = '30m' | '1h' | '90m' | 'half_day'

export interface Slot {
  id: SlotId
  label: string
  sublabel: string
  price: number
  minutes: number
}

export const SLOTS: Slot[] = [
  { id: '30m', label: '30 minutes', sublabel: 'A quick tidy-up', price: 199, minutes: 30 },
  { id: '1h', label: '1 hour', sublabel: 'Most popular', price: 349, minutes: 60 },
  { id: '90m', label: '90 minutes', sublabel: 'A thorough round', price: 499, minutes: 90 },
  { id: 'half_day', label: 'Half day', sublabel: '4 hours', price: 1199, minutes: 240 },
]

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

export const WHATSAPP_NUMBER = '917349603429'

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
 * Record the request, then hand off to WhatsApp. Recording first means ops has
 * a queue in the CRM even when the customer never sends the chat message.
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

/** The message the customer sends us, so the chat opens with the full context. */
export function whatsappMessage(input: PrimeNowInput, requestNumber: string, slot: Slot) {
  const tasks = input.tasks.length
    ? input.tasks.map((t) => TASK_LABEL[t] ?? t).join(', ')
    : 'To be discussed'
  const when =
    input.timing === 'now'
      ? 'Right now — within the hour'
      : input.scheduledFor
        ? new Date(input.scheduledFor).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : 'To be scheduled'

  return [
    `Prime Now request ${requestNumber}`,
    '',
    `Name: ${input.name}`,
    `Phone: ${input.phone}`,
    `Address: ${input.address}`,
    `Slot: ${slot.label} — ₹${slot.price}`,
    `Tasks: ${tasks}`,
    input.notes ? `Notes: ${input.notes}` : null,
    `When: ${when}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function whatsappHref(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
}

import { supabase } from './supabase'

/**
 * Prime Now — instant house help by the hour.
 *
 * No catalogue by design: the customer picks how long they need someone for,
 * ticks what needs doing, and the request is dispatched. The price list lives
 * in prime_now_slots and is edited from the CRM (migration 0034); the copy
 * shown here is display only — create_prime_now_request() re-derives the slot
 * price server-side from the same table, so a tampered client cannot buy a
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

/** Shown until the live list arrives, and offline (mirror of the seed rows). */
export const SLOTS: Slot[] = [
  { id: '30m', label: '30 minutes', sublabel: 'A quick tidy-up', price: 199, minutes: 30 },
  { id: '1h', label: '1 hour', sublabel: 'Most popular', price: 349, minutes: 60 },
  { id: '90m', label: '90 minutes', sublabel: 'A thorough round', price: 499, minutes: 90 },
  { id: 'half_day', label: 'Half day', sublabel: '4 hours', price: 1199, minutes: 240 },
]

// Module cache: screens read synchronously, refreshSlots() updates it.
let liveSlots: Slot[] = SLOTS

export function getSlots(): Slot[] {
  return liveSlots
}

/** The slot a screen was navigated to; falls back so a stale id never crashes. */
export function getSlot(id: SlotId): Slot {
  return liveSlots.find((s) => s.id === id) ?? liveSlots[0]
}

/** Fetch the CRM-controlled price list; keeps the current list on any failure. */
export async function refreshSlots(): Promise<Slot[]> {
  try {
    const { data, error } = await supabase
      .from('prime_now_slots')
      .select('id,label,sublabel,minutes,price,is_active,sort_order')
      .eq('is_active', true)
      .order('sort_order')
    if (!error && data && data.length > 0) {
      liveSlots = (data as { id: string; label: string; sublabel: string | null; minutes: number; price: number }[]).map(
        (s) => ({
          id: s.id,
          label: s.label,
          sublabel: s.sublabel ?? '',
          minutes: Number(s.minutes),
          price: Number(s.price),
        }),
      )
    }
  } catch {
    // offline: keep whatever we have
  }
  return liveSlots
}

/** A convenience for the customer, not a taxonomy — the helper reads the list. */
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

export const TASK_LABEL: Record<string, string> = Object.fromEntries(TASKS.map((t) => [t.id, t.label]))

/** Hours a scheduled visit can start at, on the hour, 8 AM to 8 PM. */
export const SCHEDULE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

export const GUARANTEES = [
  'Background-verified helper',
  'Flat hourly price, no surge',
  'Helper brings supplies',
  'Not happy? We will come back and re-clean at no extra cost',
]

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
 * Create the request. This is the whole booking — no chat handoff. It lands in
 * the CRM queue and auto-dispatches to eligible online partners, which is what
 * the matching screen then watches.
 */
export async function createPrimeNowRequest(input: PrimeNowInput): Promise<PrimeNowResult> {
  const { data, error } = await supabase.rpc('create_prime_now_request', {
    p_name: input.name,
    p_phone: input.phone,
    p_address: input.address,
    // The SQL does nullif(btrim(...), '') on these, so '' is stored as NULL.
    // PostgREST's generated arg types do not model nullability, hence ?? ''.
    p_city: input.city ?? '',
    p_slot: input.slot,
    p_tasks: input.tasks,
    p_notes: input.notes ?? '',
    p_timing: input.timing,
    p_scheduled_for: input.scheduledFor ?? undefined,
    p_source: 'app',
  })
  if (error) throw error
  return data as unknown as PrimeNowResult
}

export interface DispatchState {
  status: string
  assigned: boolean
  /** Set when the helper taps "On my way" (0030). */
  enRouteAt: string | null
}

/**
 * Poll the request while the matching screen is open.
 *
 * `prime_now_requests` is in the realtime publication, but a customer has no
 * RLS path to the row until `customer_id` is set — which only happens when the
 * request was made while signed in. Polling covers both cases and is cheap for
 * the ~90 seconds this screen is on.
 */
export async function fetchDispatchState(requestId: string): Promise<DispatchState | null> {
  const { data, error } = await supabase
    .from('prime_now_requests')
    .select('status,assigned_vendor_id,en_route_at')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as { status: string; assigned_vendor_id: string | null; en_route_at: string | null }
  return { status: row.status, assigned: row.assigned_vendor_id !== null, enRouteAt: row.en_route_at ?? null }
}

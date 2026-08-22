/**
 * Bookable arrival windows, offered at checkout, on the booking page and on
 * reschedule.
 *
 * These replaced six 2-hour windows: crews are dispatched by half-day, so the
 * narrower promise was one we could not keep. `orders.scheduled_slot` is free
 * text, so orders placed under the old windows keep their original label and
 * still render correctly everywhere.
 */
export const TIME_SLOTS = [
  'Morning · 8 AM – 12 PM',
  'Afternoon · 12 PM – 4 PM',
  'Evening · 4 PM – 8 PM',
] as const

export type TimeSlot = (typeof TIME_SLOTS)[number]

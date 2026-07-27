/** Bookable 2-hour arrival windows, offered at checkout and on reschedule. */
export const TIME_SLOTS = [
  '08:00 AM – 10:00 AM',
  '10:00 AM – 12:00 PM',
  '12:00 PM – 02:00 PM',
  '02:00 PM – 04:00 PM',
  '04:00 PM – 06:00 PM',
  '06:00 PM – 08:00 PM',
] as const

export type TimeSlot = (typeof TIME_SLOTS)[number]

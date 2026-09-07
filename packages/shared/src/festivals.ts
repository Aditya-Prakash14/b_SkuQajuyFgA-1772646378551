/**
 * Festival calendar shared by the CRM (planning calendar) and the website
 * (automatic festive theming — the "Santa cap on the logo" treatment).
 *
 * Two kinds of entries:
 *  - fixed: same Gregorian month/day every year (Republic Day, Christmas…).
 *  - dated: lunisolar or observance-dependent festivals, resolved through a
 *    per-year table. Years missing from the table simply don't render, so the
 *    table must be extended each year (see DATED_FESTIVALS).
 *
 * Islamic festival dates depend on moon sighting; they carry `approximate`.
 */

export type FestivalKind = 'indian' | 'universal'

/** data-festival attribute value on the website — one CSS palette per id. */
export type FestivalPalette =
  | 'christmas'
  | 'diwali'
  | 'holi'
  | 'tricolor'
  | 'eid'
  | 'ganesh'
  | 'harvest'
  | 'celebration'
  | 'valentine'
  | 'kite'
  | 'halloween'
  | 'peacock'

export type FestivalAccessory =
  | 'santa-cap'
  | 'diya'
  | 'colors'
  | 'flag'
  | 'crescent'
  | 'hibiscus'
  | 'flowers'
  | 'sparkler'
  | 'heart'
  | 'kite'
  | 'pumpkin'
  | 'peacock'

export interface FestivalTheme {
  palette: FestivalPalette
  /** Small decoration rendered on the website logo, à la Google/Amazon. */
  accessory: FestivalAccessory
  /** Theme goes live this many days before the main date… */
  daysBefore: number
  /** …and stays this many days after it. */
  daysAfter: number
  /** Announcement-bar greeting on the website while the theme is live. */
  greeting: string
}

export interface Festival {
  id: string
  name: string
  emoji: string
  kind: FestivalKind
  /** Multi-day festivals span this many days from the main date (default 1). */
  durationDays?: number
  /** Date depends on moon sighting / regional panchang. */
  approximate?: boolean
  theme?: FestivalTheme
}

interface FixedFestival extends Festival {
  month: number // 1-12
  day: number
}

interface DatedFestival extends Festival {
  /** year -> [month, day] */
  dates: Record<number, readonly [number, number]>
}

const FIXED_FESTIVALS: FixedFestival[] = [
  {
    id: 'new-year', name: "New Year's Day", emoji: '🎉', kind: 'universal', month: 1, day: 1,
    theme: { palette: 'celebration', accessory: 'sparkler', daysBefore: 5, daysAfter: 1, greeting: 'Happy New Year! Start it with a sparkling-clean home.' },
  },
  {
    id: 'republic-day', name: 'Republic Day', emoji: '🇮🇳', kind: 'indian', month: 1, day: 26,
    theme: { palette: 'tricolor', accessory: 'flag', daysBefore: 3, daysAfter: 0, greeting: 'Happy Republic Day! Proudly serving homes across India.' },
  },
  {
    id: 'valentines-day', name: "Valentine's Day", emoji: '💝', kind: 'universal', month: 2, day: 14,
    theme: { palette: 'valentine', accessory: 'heart', daysBefore: 2, daysAfter: 0, greeting: "Happy Valentine's Day! Show your home some love too." },
  },
  { id: 'womens-day', name: "International Women's Day", emoji: '🌸', kind: 'universal', month: 3, day: 8 },
  { id: 'earth-day', name: 'Earth Day', emoji: '🌍', kind: 'universal', month: 4, day: 22 },
  { id: 'labour-day', name: 'Labour Day', emoji: '🛠️', kind: 'universal', month: 5, day: 1 },
  { id: 'yoga-day', name: 'International Yoga Day', emoji: '🧘', kind: 'universal', month: 6, day: 21 },
  {
    id: 'independence-day', name: 'Independence Day', emoji: '🇮🇳', kind: 'indian', month: 8, day: 15,
    theme: { palette: 'tricolor', accessory: 'flag', daysBefore: 3, daysAfter: 0, greeting: 'Happy Independence Day! Jai Hind.' },
  },
  { id: 'teachers-day', name: "Teachers' Day", emoji: '📚', kind: 'indian', month: 9, day: 5 },
  { id: 'gandhi-jayanti', name: 'Gandhi Jayanti', emoji: '🕊️', kind: 'indian', month: 10, day: 2 },
  {
    id: 'halloween', name: 'Halloween', emoji: '🎃', kind: 'universal', month: 10, day: 31,
    theme: { palette: 'halloween', accessory: 'pumpkin', daysBefore: 2, daysAfter: 0, greeting: 'Happy Halloween! We make the cobwebs disappear.' },
  },
  { id: 'childrens-day', name: "Children's Day", emoji: '🎈', kind: 'indian', month: 11, day: 14 },
  {
    id: 'christmas', name: 'Christmas', emoji: '🎄', kind: 'universal', month: 12, day: 25,
    theme: { palette: 'christmas', accessory: 'santa-cap', daysBefore: 12, daysAfter: 1, greeting: 'Merry Christmas! A spotless home for the holidays.' },
  },
]

/**
 * Lunisolar / movable festivals. Dates verified against public holiday
 * calendars (drikpanchang, calendarlabs, timeanddate) — extend yearly.
 */
const DATED_FESTIVALS: DatedFestival[] = [
  {
    id: 'makar-sankranti', name: 'Makar Sankranti / Pongal', emoji: '🪁', kind: 'indian',
    dates: { 2026: [1, 14], 2027: [1, 15] },
    theme: { palette: 'kite', accessory: 'kite', daysBefore: 1, daysAfter: 1, greeting: 'Happy Makar Sankranti & Pongal!' },
  },
  { id: 'vasant-panchami', name: 'Vasant Panchami', emoji: '🌼', kind: 'indian', dates: { 2026: [1, 23], 2027: [2, 11] } },
  { id: 'maha-shivratri', name: 'Maha Shivratri', emoji: '🔱', kind: 'indian', dates: { 2026: [2, 15], 2027: [3, 6] } },
  {
    id: 'holi', name: 'Holi', emoji: '🎨', kind: 'indian',
    dates: { 2026: [3, 4], 2027: [3, 22] },
    theme: { palette: 'holi', accessory: 'colors', daysBefore: 4, daysAfter: 1, greeting: 'Happy Holi! We handle the colour stains.' },
  },
  {
    id: 'eid-al-fitr', name: 'Eid al-Fitr', emoji: '🌙', kind: 'indian', approximate: true,
    dates: { 2026: [3, 21], 2027: [3, 10] },
    theme: { palette: 'eid', accessory: 'crescent', daysBefore: 2, daysAfter: 1, greeting: 'Eid Mubarak from My Prime Company!' },
  },
  { id: 'ugadi', name: 'Ugadi / Gudi Padwa', emoji: '🥭', kind: 'indian', dates: { 2026: [3, 19], 2027: [4, 7] } },
  { id: 'ram-navami', name: 'Ram Navami', emoji: '🏹', kind: 'indian', dates: { 2026: [3, 26], 2027: [4, 15] } },
  { id: 'good-friday', name: 'Good Friday', emoji: '✝️', kind: 'universal', dates: { 2026: [4, 3], 2027: [3, 26] } },
  { id: 'easter', name: 'Easter Sunday', emoji: '🐣', kind: 'universal', dates: { 2026: [4, 5], 2027: [3, 28] } },
  {
    id: 'eid-al-adha', name: 'Eid al-Adha (Bakrid)', emoji: '🕌', kind: 'indian', approximate: true,
    dates: { 2026: [5, 28], 2027: [5, 17] },
    theme: { palette: 'eid', accessory: 'crescent', daysBefore: 1, daysAfter: 1, greeting: 'Eid Mubarak from My Prime Company!' },
  },
  { id: 'mothers-day', name: "Mother's Day", emoji: '💐', kind: 'universal', dates: { 2026: [5, 10], 2027: [5, 9] } },
  { id: 'fathers-day', name: "Father's Day", emoji: '👔', kind: 'universal', dates: { 2026: [6, 21], 2027: [6, 20] } },
  { id: 'raksha-bandhan', name: 'Raksha Bandhan', emoji: '🪢', kind: 'indian', dates: { 2026: [8, 28], 2027: [8, 17] } },
  {
    id: 'onam', name: 'Onam (Thiruvonam)', emoji: '🌺', kind: 'indian',
    dates: { 2026: [8, 26], 2027: [9, 12] },
    theme: { palette: 'harvest', accessory: 'flowers', daysBefore: 3, daysAfter: 0, greeting: 'Happy Onam! Wishing you a golden harvest.' },
  },
  {
    id: 'janmashtami', name: 'Krishna Janmashtami', emoji: '🦚', kind: 'indian',
    dates: { 2026: [9, 4], 2027: [8, 25] },
    theme: { palette: 'peacock', accessory: 'peacock', daysBefore: 1, daysAfter: 0, greeting: 'Happy Janmashtami from My Prime Company!' },
  },
  {
    id: 'ganesh-chaturthi', name: 'Ganesh Chaturthi', emoji: '🌺', kind: 'indian', durationDays: 10,
    dates: { 2026: [9, 14], 2027: [9, 4] },
    theme: { palette: 'ganesh', accessory: 'hibiscus', daysBefore: 2, daysAfter: 10, greeting: 'Ganpati Bappa Morya! Happy Ganesh Chaturthi.' },
  },
  { id: 'navratri', name: 'Navratri begins', emoji: '💃', kind: 'indian', durationDays: 9, dates: { 2026: [10, 11], 2027: [9, 30] } },
  { id: 'dussehra', name: 'Dussehra (Vijaya Dashami)', emoji: '🛕', kind: 'indian', dates: { 2026: [10, 20], 2027: [10, 9] } },
  { id: 'karva-chauth', name: 'Karva Chauth', emoji: '🌕', kind: 'indian', dates: { 2026: [10, 29], 2027: [10, 18] } },
  { id: 'dhanteras', name: 'Dhanteras', emoji: '🪙', kind: 'indian', dates: { 2026: [11, 6], 2027: [10, 27] } },
  {
    id: 'diwali', name: 'Diwali', emoji: '🪔', kind: 'indian',
    dates: { 2026: [11, 8], 2027: [10, 29] },
    theme: { palette: 'diwali', accessory: 'diya', daysBefore: 10, daysAfter: 2, greeting: 'Happy Diwali! Book your festive deep clean.' },
  },
  { id: 'bhai-dooj', name: 'Bhai Dooj', emoji: '🤝', kind: 'indian', dates: { 2026: [11, 10], 2027: [10, 31] } },
  { id: 'guru-nanak-jayanti', name: 'Guru Nanak Jayanti', emoji: '🙏', kind: 'indian', dates: { 2026: [11, 24] } },
]

export interface FestivalOccurrence {
  festival: Festival
  /** Main day, local time midnight. */
  date: Date
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** All known festival occurrences in a calendar year, sorted by date. */
export function festivalsForYear(year: number): FestivalOccurrence[] {
  const out: FestivalOccurrence[] = []
  for (const f of FIXED_FESTIVALS) out.push({ festival: f, date: new Date(year, f.month - 1, f.day) })
  for (const f of DATED_FESTIVALS) {
    const md = f.dates[year]
    if (md) out.push({ festival: f, date: new Date(year, md[0] - 1, md[1]) })
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Festivals whose span touches the given month (0-indexed monthIndex). */
export function festivalsInMonth(year: number, monthIndex: number): FestivalOccurrence[] {
  const years = monthIndex === 0 ? [year - 1, year] : [year]
  return years
    .flatMap(festivalsForYear)
    .filter((o) => {
      const span = o.festival.durationDays ?? 1
      const last = addDays(o.date, span - 1)
      return (
        (o.date.getFullYear() === year && o.date.getMonth() === monthIndex) ||
        (last.getFullYear() === year && last.getMonth() === monthIndex)
      )
    })
}

/** The next `count` festivals from a date (inclusive of today). */
export function upcomingFestivals(from: Date, count: number): FestivalOccurrence[] {
  const t = startOfDay(from).getTime()
  return [...festivalsForYear(from.getFullYear()), ...festivalsForYear(from.getFullYear() + 1)]
    .filter((o) => o.date.getTime() >= t)
    .slice(0, count)
}

export interface ActiveFestivalTheme {
  festival: Festival
  theme: FestivalTheme
  /** Main festival day. */
  date: Date
  /** First and last day (inclusive) the theme is live. */
  start: Date
  end: Date
}

/**
 * The festival theme the website should wear on a given date, or null.
 * When windows overlap, the festival whose main day is nearest wins.
 */
export function activeFestivalTheme(on: Date): ActiveFestivalTheme | null {
  const day = startOfDay(on)
  const candidates: ActiveFestivalTheme[] = []
  for (const y of [day.getFullYear() - 1, day.getFullYear(), day.getFullYear() + 1]) {
    for (const o of festivalsForYear(y)) {
      const theme = o.festival.theme
      if (!theme) continue
      const start = addDays(o.date, -theme.daysBefore)
      const end = addDays(o.date, theme.daysAfter)
      if (day.getTime() >= start.getTime() && day.getTime() <= end.getTime()) {
        candidates.push({ festival: o.festival, theme, date: o.date, start, end })
      }
    }
  }
  if (!candidates.length) return null
  return candidates.sort(
    (a, b) => Math.abs(a.date.getTime() - day.getTime()) - Math.abs(b.date.getTime() - day.getTime()),
  )[0]
}

/**
 * The theme of a specific festival by id, resolved to its occurrence nearest
 * `ref` — used by the website's `?festival=<id>` preview mode.
 */
export function festivalThemeById(id: string, ref: Date = new Date()): ActiveFestivalTheme | null {
  const matches: ActiveFestivalTheme[] = []
  for (const y of [ref.getFullYear() - 1, ref.getFullYear(), ref.getFullYear() + 1]) {
    for (const o of festivalsForYear(y)) {
      if (o.festival.id !== id || !o.festival.theme) continue
      const theme = o.festival.theme
      matches.push({
        festival: o.festival,
        theme,
        date: o.date,
        start: addDays(o.date, -theme.daysBefore),
        end: addDays(o.date, theme.daysAfter),
      })
    }
  }
  if (!matches.length) return null
  return matches.sort(
    (a, b) => Math.abs(a.date.getTime() - ref.getTime()) - Math.abs(b.date.getTime() - ref.getTime()),
  )[0]
}

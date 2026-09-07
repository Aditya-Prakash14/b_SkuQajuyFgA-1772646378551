'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Palette, Sparkles } from 'lucide-react'
import {
  activeFestivalTheme,
  festivalsInMonth,
  upcomingFestivals,
  type FestivalOccurrence,
} from '@prime/shared'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const fmtDay = (d: Date) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

export default function FestivalCalendar() {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const occurrences = useMemo(() => festivalsInMonth(year, month), [year, month])
  const upcoming = useMemo(() => upcomingFestivals(today, 8), [today])
  const live = useMemo(() => activeFestivalTheme(today), [today])

  // Festivals keyed by day-of-month; a multi-day festival is listed on its
  // main day only, with the span shown on the chip.
  const byDay = useMemo(() => {
    const map = new Map<number, FestivalOccurrence[]>()
    for (const o of occurrences) {
      if (o.date.getFullYear() !== year || o.date.getMonth() !== month) continue
      const d = o.date.getDate()
      map.set(d, [...(map.get(d) ?? []), o])
    }
    return map
  }, [occurrences, year, month])

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const step = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{MONTHS[month]} {year}</CardTitle>
            <CardDescription>Indian &amp; universal festivals — moon-dependent dates marked ~</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 border-b pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <div
                key={i}
                className={cn(
                  'min-h-20 border-b border-r p-1 text-xs first:border-l [&:nth-child(7n+1)]:border-l',
                  day === null && 'bg-muted/40',
                )}
              >
                {day !== null && (
                  <>
                    <span
                      className={cn(
                        'mb-1 inline-grid h-6 w-6 place-items-center rounded-full font-semibold',
                        isToday(day) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {(byDay.get(day) ?? []).map((o) => (
                        <div
                          key={o.festival.id}
                          title={`${o.festival.name}${o.festival.approximate ? ' (date may shift with moon sighting)' : ''}${o.festival.theme ? ' · website theme' : ''}`}
                          className={cn(
                            'truncate rounded px-1 py-0.5 text-[11px] font-medium leading-tight',
                            o.festival.kind === 'indian'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300'
                              : 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300',
                          )}
                        >
                          {o.festival.emoji} {o.festival.approximate && '~'}{o.festival.name}
                          {(o.festival.durationDays ?? 1) > 1 && (
                            <span className="text-[10px] opacity-70"> · {o.festival.durationDays}d</span>
                          )}
                          {o.festival.theme && ' 🎨'}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> Indian festival
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-300" /> Universal
            </span>
            <span>🎨 decorates the website (colours stay black &amp; white)</span>
            <span>~ date depends on moon sighting</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" /> Website dress-up
            </CardTitle>
            <CardDescription>Decorations only — the black &amp; white theme never changes</CardDescription>
          </CardHeader>
          <CardContent>
            {live ? (
              <div className="space-y-1.5">
                <p className="text-lg font-bold">{live.festival.emoji} {live.festival.name}</p>
                <p className="text-sm text-muted-foreground">
                  Live {fmtDay(live.start)} – {fmtDay(live.end)}
                </p>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm italic">“{live.theme.greeting}”</p>
                <Badge variant="brand">Decorations live now</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No festival decorations are live today. The next decorated festival switches
                them on automatically — the black &amp; white theme stays either way.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Coming up
            </CardTitle>
            <CardDescription>Next 8 festivals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {upcoming.map((o) => (
              <div key={`${o.festival.id}-${o.date.getFullYear()}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">
                  {o.festival.emoji} {o.festival.approximate && '~'}{o.festival.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtDay(o.date)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

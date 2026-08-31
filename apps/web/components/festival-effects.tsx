'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useFestival } from '@/lib/festival-context'
import type { FestivalPalette } from '@prime/shared'

/**
 * The bigger festive set-dressing, all keyed off FestivalProvider:
 *  - FestivalParticles: a gentle full-screen drift of festival emoji
 *    (snow, diwali sparks, gulal, confetti…), pointer-events-none and
 *    hidden entirely under prefers-reduced-motion (see globals.css).
 *  - FestivalBunting: a strip along the header's bottom edge — twinkling
 *    string lights for the lights festivals, triangle bunting elsewhere.
 */

const PARTICLES: Record<FestivalPalette, string[]> = {
  christmas: ['❄️', '❄️', '✨'],
  diwali: ['✨', '🎇', '🪔'],
  holi: ['🟡', '🟢', '🟣', '🔴', '🔵'],
  tricolor: ['🟠', '⚪', '🟢'],
  eid: ['🌙', '⭐', '✨'],
  ganesh: ['🌺', '🌼', '✨'],
  harvest: ['🌼', '🌸', '🍃'],
  celebration: ['🎊', '🎉', '✨'],
  valentine: ['💗', '💖', '💝'],
  kite: ['🪁', '✨'],
  halloween: ['🦇', '🎃', '🍂'],
  peacock: ['🪶', '✨'],
}

/** Festivals of lights get bulbs; the rest get bunting flags. */
const LIGHT_PALETTES: readonly FestivalPalette[] = ['christmas', 'diwali', 'celebration']

/** Ornaments swinging from the festival banner, outermost first. */
const HANGINGS: Record<FestivalPalette, string[]> = {
  christmas: ['🔔', '🎁', '🎄', '🎁', '🔔'],
  diwali: ['🪔', '🏮', '✨', '🏮', '🪔'],
  holi: ['🎨', '🟣', '🟢', '🟡', '🎨'],
  tricolor: ['🇮🇳', '🧡', '🤍', '💚', '🇮🇳'],
  eid: ['🏮', '🌙', '⭐', '🌙', '🏮'],
  ganesh: ['🌺', '🪔', '🌼', '🪔', '🌺'],
  harvest: ['🌼', '🌺', '🌸', '🌺', '🌼'],
  celebration: ['🎊', '🎈', '🎉', '🎈', '🎊'],
  valentine: ['💝', '💘', '💖', '💘', '💝'],
  kite: ['🪁', '🎐', '☁️', '🎐', '🪁'],
  halloween: ['🎃', '👻', '🕸️', '🦇', '🎃'],
  peacock: ['🦚', '🪶', '💙', '🪶', '🦚'],
}

/** Festivals whose floors get a rangoli in the page corners. */
const RANGOLI_PALETTES: readonly FestivalPalette[] = [
  'diwali', 'ganesh', 'harvest', 'holi', 'peacock', 'tricolor',
]

export function FestivalParticles() {
  const festival = useFestival()

  // Deterministic golden-ratio spread instead of Math.random so the layer is
  // stable across re-renders; negative delays start every drop mid-flight.
  const drops = useMemo(() => {
    if (!festival) return []
    const set = PARTICLES[festival.theme.palette] ?? ['✨']
    return Array.from({ length: 16 }, (_, i) => ({
      emoji: set[i % set.length],
      left: `${(i * 61.8) % 100}%`,
      delay: `-${((i * 1.7) % 12).toFixed(1)}s`,
      duration: `${(11 + (i % 5) * 2.4).toFixed(1)}s`,
      size: `${13 + ((i * 7) % 10)}px`,
    }))
  }, [festival])

  if (!festival) return null
  return (
    <div className="festival-particles pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {drops.map((d, i) => (
        <span
          key={i}
          className="absolute -top-10 opacity-80"
          style={{
            left: d.left,
            fontSize: d.size,
            animation: `festival-fall ${d.duration} linear ${d.delay} infinite`,
          }}
        >
          {d.emoji}
        </span>
      ))}
    </div>
  )
}

export function FestivalBunting() {
  const festival = useFestival()
  if (!festival) return null

  if (LIGHT_PALETTES.includes(festival.theme.palette)) {
    return (
      <div className="flex w-full justify-between px-2" aria-hidden="true">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="festival-bulb"
            style={{
              background: i % 2 ? 'var(--brand)' : 'var(--primary)',
              animationDelay: `${(i % 4) * 0.45}s`,
            }}
          />
        ))}
      </div>
    )
  }

  const colors = ['var(--primary)', 'var(--brand)', 'var(--secondary-foreground)']
  return (
    <div className="flex w-full" aria-hidden="true">
      {Array.from({ length: 40 }).map((_, i) => (
        <span key={i} className="festival-flag" style={{ background: colors[i % 3] }} />
      ))}
    </div>
  )
}

/**
 * The festive band under the header: gradient in the festival colours,
 * swinging ornaments on strings, the greeting writ large, and a CTA into
 * deep cleaning. Scrolls away with the page — the sticky header stays lean.
 */
export function FestivalBanner() {
  const festival = useFestival()
  if (!festival) return null

  const hangs = HANGINGS[festival.theme.palette] ?? []
  const strings = [16, 30, 10, 26, 18]
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary to-primary/85 text-primary-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden justify-between px-[6%] sm:flex" aria-hidden="true">
        {hangs.map((h, i) => (
          <span key={i} className="festival-hang" style={{ animationDelay: `${i * 0.4}s` }}>
            <i style={{ height: strings[i % strings.length] }} />
            <span className="text-lg drop-shadow-sm">{h}</span>
          </span>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 text-center sm:py-5">
        <span className="text-2xl" aria-hidden="true">{festival.festival.emoji}</span>
        <p className="text-sm font-bold sm:text-base">{festival.theme.greeting}</p>
        <Link
          href="/deep-cleaning"
          className="rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground shadow-md transition-transform hover:scale-105"
        >
          Book a festive clean →
        </Link>
      </div>
    </div>
  )
}

/** Faint rangoli quarter-circles in the bottom corners (Indian festivals). */
export function FestivalRangoli() {
  const festival = useFestival()
  if (!festival || !RANGOLI_PALETTES.includes(festival.theme.palette)) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden md:block" aria-hidden="true">
      <span className="festival-rangoli -bottom-24 -left-24" />
      <span className="festival-rangoli -bottom-24 -right-24" />
    </div>
  )
}

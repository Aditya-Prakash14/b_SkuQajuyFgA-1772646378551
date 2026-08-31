'use client'

import { useMemo } from 'react'
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

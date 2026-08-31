'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { activeFestivalTheme, festivalThemeById, type ActiveFestivalTheme } from '@prime/shared'

/**
 * Automatic festive theming — the Google/Amazon "cap on the logo" treatment.
 *
 * When today falls inside a themed festival's window (see
 * packages/shared/src/festivals.ts) this provider stamps
 * `data-festival="<palette>"` on <html>, which swaps the site's accent tokens
 * via globals.css, and exposes the festival so the header can dress the logo
 * and greet visitors. Resolved after mount so SSR output stays date-agnostic
 * (no hydration mismatch, no stale cached theme).
 */
const FestivalContext = createContext<ActiveFestivalTheme | null>(null)

export function FestivalProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveFestivalTheme | null>(null)

  useEffect(() => {
    const apply = () => {
      const next = previewTheme() ?? activeFestivalTheme(new Date())
      setActive(next)
      const root = document.documentElement
      if (next) root.setAttribute('data-festival', next.theme.palette)
      else root.removeAttribute('data-festival')
    }
    apply()
    // Re-evaluate hourly so a tab left open crosses into/out of a festival.
    const id = setInterval(apply, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return <FestivalContext.Provider value={active}>{children}</FestivalContext.Provider>
}

export const useFestival = () => useContext(FestivalContext)

/**
 * Testing hook: `?festival=diwali` forces a festival's theme by id, and
 * `?festival=2026-09-04` shows whatever theme would be live on that date.
 * Remove the query param and the site snaps back to today's reality.
 */
function previewTheme(): ActiveFestivalTheme | null {
  const raw = new URLSearchParams(window.location.search).get('festival')
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number)
    return activeFestivalTheme(new Date(y, m - 1, d))
  }
  return festivalThemeById(raw)
}

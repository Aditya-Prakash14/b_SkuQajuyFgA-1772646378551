'use client'

import { useFestival } from '@/lib/festival-context'
import type { FestivalAccessory } from '@prime/shared'

/**
 * Festive dress-up for the site chrome, driven by FestivalProvider.
 * Everything renders nothing outside a festival window, so the header can
 * mount these unconditionally.
 */

// Emoji accessories perch on the logo's top-right corner; the Santa cap gets
// a proper SVG so it reads as a cap sitting ON the logo, not a sticker.
const EMOJI: Partial<Record<FestivalAccessory, string>> = {
  diya: '🪔',
  colors: '🎨',
  flag: '🇮🇳',
  crescent: '🌙',
  hibiscus: '🌺',
  flowers: '🌼',
  sparkler: '🎆',
  heart: '💝',
  kite: '🪁',
  pumpkin: '🎃',
  peacock: '🦚',
}

function SantaCap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden="true">
      <path d="M6 16 C7 7, 16 2, 24 5 C28 6.5, 30 10, 29 13 L8 18 Z" fill="#d0342c" />
      <path d="M5 17.5 L29.5 12 C31 14 30.5 16 29 16.5 L7 21.5 C5 21.5 4.5 19 5 17.5 Z" fill="#ffffff" />
      <circle cx="29.5" cy="10.5" r="3" fill="#ffffff" />
    </svg>
  )
}

/** The cap/diya/flag on the logo. Render inside a `relative` wrapper. */
export function LogoFestivalAccessory() {
  const festival = useFestival()
  if (!festival) return null

  if (festival.theme.accessory === 'santa-cap') {
    return (
      <SantaCap className="pointer-events-none absolute -right-2.5 -top-3 h-5 w-7 -rotate-6 drop-shadow-sm" />
    )
  }
  const emoji = EMOJI[festival.theme.accessory]
  if (!emoji) return null
  return (
    <span
      className="pointer-events-none absolute -right-2 -top-2.5 rotate-12 text-sm drop-shadow-sm"
      aria-hidden="true"
    >
      {emoji}
    </span>
  )
}

/** Festival greeting for the announcement bar. */
export function FestivalGreeting({ fallback }: { fallback: React.ReactNode }) {
  const festival = useFestival()
  if (!festival) return <>{fallback}</>
  return (
    <span className="font-semibold">
      {festival.festival.emoji} {festival.theme.greeting}
    </span>
  )
}

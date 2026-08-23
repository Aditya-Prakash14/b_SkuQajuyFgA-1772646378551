/**
 * Brand tokens for the few places that need raw values (StyleSheet, the
 * ActivityIndicator colour). Everything else styles through NativeWind classes
 * backed by tailwind.config.js.
 *
 * Mirrors the website palette in apps/web/app/globals.css:
 *   --primary    #0E5A63  deep teal
 *   --background #FBFAF7  warm off-white
 *   --ink        #12212A  dark bands
 *   --brand      #E8A33D  amber, on dark grounds and primary CTAs
 */
export const colors = {
  primary: '#0E5A63',
  primaryDark: '#0A464D',
  accent: '#E8A33D',

  bg: '#FBFAF7',
  card: '#FFFFFF',
  border: '#E7E3DB',
  borderFocus: '#0E5A63',

  ink: '#12212A',
  inkForeground: '#FBFAF7',

  text: '#12212A',
  muted: '#5F6B70',
  faint: '#94A0A4',

  success: '#1F8A4C',
  successBg: '#EFF7F1',
  danger: '#B3261E',
  dangerBg: '#FCF1F0',
  warn: '#B45309',
  warnBg: '#FDF6EC',
} as const

/** Matches the website's 18–24px radii. */
export const radius = { sm: 10, md: 14, lg: 20, xl: 24 } as const
export const space = (n: number) => n * 4

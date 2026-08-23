/**
 * Raw token values for the few places that need them (StyleSheet, indicator
 * colours, status bar). Everything else styles through NativeWind classes
 * backed by tailwind.config.js.
 *
 * One palette across the website, the partner app and this app — see
 * apps/web/app/globals.css for the canonical definition.
 */
export const colors = {
  primary: '#0E5A63',
  primaryDark: '#0A464D',
  brand: '#E8A33D',

  bg: '#FBFAF7',
  card: '#FFFFFF',
  border: '#E7E3DB',
  tint: '#EDF3F2',

  ink: '#12212A',
  inkForeground: '#FBFAF7',

  text: '#12212A',
  muted: '#5F6B70',
  faint: '#94A0A4',

  success: '#1F8A4C',
  destructive: '#C0553F',
  warning: '#B45309',
} as const

/** Spec: 14–18px on cards and inputs, 16px on buttons, 999px on chips. */
export const radius = { sm: 10, md: 14, lg: 18, button: 16, pill: 999 } as const

/** 22px screen gutters. */
export const GUTTER = 22

export const space = (n: number) => n * 4

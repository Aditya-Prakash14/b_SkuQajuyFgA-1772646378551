import { useColorScheme } from 'nativewind'

/**
 * Raw colour values, for the handful of places that cannot take a className:
 * ActivityIndicator, the React Navigation theme, the tab bar, and anything
 * passed to a native component as a prop.
 *
 * These mirror the tokens in global.css exactly — that file is the source of
 * truth for everything styled with classes, and this is the same palette in a
 * form JavaScript can hand to a native prop. Keep the two in step.
 */

export interface Palette {
  primary: string
  primaryForeground: string
  brand: string
  brandForeground: string
  bg: string
  card: string
  border: string
  input: string
  tint: string
  ink: string
  inkForeground: string
  deep: string
  text: string
  muted: string
  faint: string
  success: string
  destructive: string
  warning: string
}

export const lightColors: Palette = {
  primary: '#0E5A63',
  primaryForeground: '#FFFFFF',
  brand: '#E8A33D',
  brandForeground: '#12212A',

  bg: '#FBFAF7',
  card: '#FFFFFF',
  border: '#E7E3DB',
  input: '#E7E3DB',
  tint: '#EDF3F2',

  ink: '#12212A',
  inkForeground: '#FBFAF7',
  deep: '#0E5A63',

  text: '#12212A',
  muted: '#5F6B70',
  faint: '#94A0A4',

  success: '#1F8A4C',
  destructive: '#C0553F',
  warning: '#B45309',
}

export const darkColors: Palette = {
  primary: '#4EA3AC',
  primaryForeground: '#06171B',
  brand: '#E8A33D',
  brandForeground: '#12212A',

  bg: '#0D1A21',
  card: '#12212A',
  border: '#2A3942',
  input: '#2E3D47',
  tint: '#1B2F38',

  ink: '#0A151B',
  inkForeground: '#F4F2ED',
  deep: '#0A3E45',

  text: '#F4F2ED',
  muted: '#9AABB0',
  faint: '#7A8A90',

  success: '#5CCB87',
  destructive: '#E5645B',
  warning: '#D9922F',
}

/** The palette for the active theme. Use inside components. */
export function useColors() {
  const { colorScheme } = useColorScheme()
  return colorScheme === 'dark' ? darkColors : lightColors
}

/**
 * Light palette as a plain object.
 *
 * Kept for module-scope constants that cannot call a hook. Anything rendered
 * should use useColors() instead, or it will stay light in dark mode.
 */
export const colors = lightColors

/** Spec: 14–18px on cards and inputs, 16px on buttons, 999px on chips. */
export const radius = { sm: 10, md: 14, lg: 18, button: 16, pill: 999 } as const

/** 22px screen gutters. */
export const GUTTER = 22

export const space = (n: number) => n * 4

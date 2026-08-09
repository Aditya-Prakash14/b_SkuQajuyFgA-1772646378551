/**
 * Brand tokens mirrored from packages/shared/styles/theme.css, converted from
 * oklch to hex because React Native's StyleSheet has no oklch() support.
 *   --primary oklch(0.36 0.22 264)  →  #2E1BAD
 *   --accent  oklch(0.70 0.18 45)   →  #E8712C
 */
export const colors = {
  primary: '#2E1BAD',
  primaryDark: '#241589',
  accent: '#E8712C',

  bg: '#F7F8FB',
  card: '#FFFFFF',
  border: '#E6E8EF',
  borderFocus: '#2E1BAD',

  text: '#12131A',
  muted: '#6B7280',
  faint: '#9CA3AF',

  success: '#15803D',
  successBg: '#F0FDF4',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  warn: '#B45309',
  warnBg: '#FFFBEB',
} as const

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 } as const
export const space = (n: number) => n * 4

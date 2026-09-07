/** @type {import('tailwindcss').Config} */

// Every colour resolves through a CSS variable defined in global.css, so a
// component styles once and both themes follow. <alpha-value> keeps opacity
// utilities (bg-brand/20, border-white/10) working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        brand: { DEFAULT: token('brand'), foreground: token('brand-foreground') },
        ink: { DEFAULT: token('ink'), foreground: token('ink-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        success: { DEFAULT: token('success'), foreground: token('success-foreground') },
        warning: { DEFAULT: token('warning'), foreground: token('warning-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
      },
      // Spec: 14–18px on cards and inputs, 16px on buttons, 999px on chips.
      borderRadius: { sm: '10px', md: '14px', lg: '18px', pill: '999px' },
      fontFamily: {
        sans: ['Manrope_400Regular'],
        medium: ['Manrope_500Medium'],
        semibold: ['Manrope_600SemiBold'],
        bold: ['Manrope_700Bold'],
        black: ['Manrope_800ExtraBold'],
        mono: ['JetBrainsMono_400Regular'],
        monomd: ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
}

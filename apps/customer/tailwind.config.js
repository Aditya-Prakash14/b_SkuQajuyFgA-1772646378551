/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // One palette across website, partner app and customer app.
      // See apps/web/app/globals.css — this is the same system in hex,
      // because React Native has no oklch support.
      colors: {
        border: '#E7E3DB',
        input: '#E7E3DB',
        ring: '#0E5A63',
        background: '#FBFAF7',
        foreground: '#12212A',
        primary: { DEFAULT: '#0E5A63', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#EDF3F2', foreground: '#0E5A63' },
        muted: { DEFAULT: '#EDF3F2', foreground: '#5F6B70' },
        accent: { DEFAULT: '#EDF3F2', foreground: '#0E5A63' },
        brand: { DEFAULT: '#E8A33D', foreground: '#12212A' },
        ink: { DEFAULT: '#12212A', foreground: '#FBFAF7' },
        destructive: { DEFAULT: '#C0553F', foreground: '#FFFFFF' },
        success: { DEFAULT: '#1F8A4C', foreground: '#FFFFFF' },
        warning: { DEFAULT: '#B45309', foreground: '#FFFFFF' },
        card: { DEFAULT: '#FFFFFF', foreground: '#12212A' },
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

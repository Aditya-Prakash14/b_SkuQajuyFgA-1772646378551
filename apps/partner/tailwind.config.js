/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Mirrors the website palette in apps/web/app/globals.css so a partner and
      // a customer see the same brand: deep teal on a warm off-white ground,
      // dark bands for emphasis, amber reserved for the primary call to action.
      // Hex because React Native has no oklch support.
      colors: {
        border: '#E7E3DB',
        input: '#E7E3DB',
        ring: '#0E5A63',
        background: '#FBFAF7',
        foreground: '#12212A',
        primary: { DEFAULT: '#0E5A63', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#EDF3F2', foreground: '#0E5A63' },
        muted: { DEFAULT: '#EDF3F2', foreground: '#5F6B70' },
        // shadcn convention: `accent` is a neutral hover tint, not the brand.
        accent: { DEFAULT: '#EDF3F2', foreground: '#0E5A63' },
        brand: { DEFAULT: '#E8A33D', foreground: '#12212A' },
        // Dark band, matching the website's ink sections.
        ink: { DEFAULT: '#12212A', foreground: '#FBFAF7' },
        destructive: { DEFAULT: '#B3261E', foreground: '#FFFFFF' },
        success: { DEFAULT: '#1F8A4C', foreground: '#FFFFFF' },
        warning: { DEFAULT: '#B45309', foreground: '#FFFFFF' },
        card: { DEFAULT: '#FFFFFF', foreground: '#12212A' },
      },
      borderRadius: {
        lg: '20px',
        md: '14px',
        sm: '10px',
      },
    },
  },
  plugins: [],
}

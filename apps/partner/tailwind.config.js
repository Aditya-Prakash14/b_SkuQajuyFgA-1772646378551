/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Mirrors packages/shared/styles/theme.css, converted from oklch to hex
      // (RN has no oklch support). Same split as the web apps: `primary` is the
      // brand blue, `brand` is the orange CTA color, `accent` stays a neutral
      // hover tint per shadcn convention.
      colors: {
        border: '#E6E8EF',
        input: '#E1E3EA',
        ring: '#2E1BAD',
        background: '#F7F8FB',
        foreground: '#12131A',
        primary: { DEFAULT: '#2E1BAD', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#EEF0F6', foreground: '#12131A' },
        muted: { DEFAULT: '#F1F2F7', foreground: '#6B7280' },
        accent: { DEFAULT: '#F1F2F7', foreground: '#12131A' },
        brand: { DEFAULT: '#E8712C', foreground: '#FFFFFF' },
        destructive: { DEFAULT: '#DC2626', foreground: '#FFFFFF' },
        success: { DEFAULT: '#15803D', foreground: '#FFFFFF' },
        warning: { DEFAULT: '#B45309', foreground: '#FFFFFF' },
        card: { DEFAULT: '#FFFFFF', foreground: '#12131A' },
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
    },
  },
  plugins: [],
}

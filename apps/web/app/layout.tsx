import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SITE_URL } from '@/lib/env'
import { AuthProvider } from '@/lib/auth-context'
import { CityProvider } from '@/lib/city-context'
import { CartProvider } from '@/lib/cart-context'
import CartDrawer from '@/components/cart-drawer'
// @ts-ignore: CSS module side-effect import (no type declarations in this repo)
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

const TITLE = 'MyPrimeCompany | Professional Home & Office Cleaning Services'
const DESCRIPTION =
  'MyPrimeCompany offers home deep cleaning (1/2/3/4 BHK), bathroom & kitchen cleaning, sofa shampooing, carpet cleaning, pest control, marble polishing and corporate cleaning. Book trusted experts at your doorstep.'

export const metadata: Metadata = {
  // Resolves relative OG/canonical URLs against the real deployed origin.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'MyPrimeCompany',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <CityProvider>
            <CartProvider>
              {children}
              <CartDrawer />
            </CartProvider>
          </CityProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}

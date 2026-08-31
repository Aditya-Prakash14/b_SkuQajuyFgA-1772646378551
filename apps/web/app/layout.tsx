import type { Metadata } from 'next'
import Script from 'next/script'
import { Manrope, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SITE_URL } from '@/lib/env'
import { AuthProvider } from '@/lib/auth-context'
import { CityProvider } from '@/lib/city-context'
import { CartProvider } from '@/lib/cart-context'
import { FestivalProvider } from '@/lib/festival-context'
import CartDrawer from '@/components/cart-drawer'
// @ts-ignore: CSS module side-effect import (no type declarations in this repo)
import './globals.css'

// Manrope carries the whole site; JetBrains Mono is reserved for small
// uppercase metadata (category counts, labels) — see .label-mono in globals.css.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})
const TITLE = 'My Prime Company'
const GA_MEASUREMENT_ID = 'G-JGZ52K9QXX'

const DESCRIPTION =
  'My Prime Company offers home deep cleaning (1/2/3/4 BHK), bathroom & kitchen cleaning, sofa shampooing, carpet cleaning, pest control, marble polishing and corporate cleaning. Book trusted experts at your doorstep.'

export const metadata: Metadata = {
  // Resolves relative OG/canonical URLs against the real deployed origin.
  metadataBase: new URL(SITE_URL),
  // Pages that set their own title render as "<page> | My Prime Company".
  title: { default: TITLE, template: `%s | ${TITLE}` },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: TITLE,
    locale: 'en_IN',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <FestivalProvider>
          <AuthProvider>
            <CityProvider>
              <CartProvider>
                {children}
                <CartDrawer />
              </CartProvider>
            </CityProvider>
          </AuthProvider>
        </FestivalProvider>
        <Analytics />
        {/* Google tag (gtag.js) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
      </body>
    </html>
  )
}

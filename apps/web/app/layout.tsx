import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { CityProvider } from '@/lib/city-context'
import { CartProvider } from '@/lib/cart-context'
import CartDrawer from '@/components/cart-drawer'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MyPrimeCompany | Professional Home & Office Cleaning Services',
  description:
    'MyPrimeCompany offers home deep cleaning (1/2/3/4 BHK), bathroom & kitchen cleaning, sofa shampooing, carpet cleaning, pest control, marble polishing and corporate cleaning. Book trusted experts at your doorstep.',
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

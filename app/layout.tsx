import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import CartDrawer from '@/components/cart-drawer'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Prime Home Care | Professional Home & Office Cleaning Services',
  description: 'Prime Home Care offers professional home deep cleaning, bathroom cleaning, sofa shampooing, carpet cleaning, pest control, marble polishing and more. Book trusted experts at your doorstep.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  )
}

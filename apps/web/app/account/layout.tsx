'use client'

import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { PageShell } from '@/components/page-shell'
import { AccountNav } from '@/components/account/account-nav'
import { GoogleMark } from '@/components/site-header'
import { Button } from '@/components/ui/button'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth()

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[60vh]">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="mx-auto max-w-md text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 grid place-items-center mb-5">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Sign in to your account</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              View your bookings, reschedule or cancel a service, manage saved addresses and
              review completed work — all in one place.
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => signInWithGoogle('/account')}
              className="mt-6 gap-3 font-bold"
            >
              <GoogleMark className="w-5 h-5" /> Continue with Google
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">My Account</h1>
            <AccountNav />
            <div className="mt-6">{children}</div>
          </>
        )}
      </div>
    </PageShell>
  )
}

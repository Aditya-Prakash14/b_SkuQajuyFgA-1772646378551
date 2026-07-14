'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const configured = isSupabaseConfigured()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    // NOTE: only signInWithPassword — there is NO signUp anywhere in the CRM.
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError || !data.user) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    const { data: adminRow, error: adminError } = await supabase
      .from('admin_users')
      .select('is_active')
      .eq('id', data.user.id)
      .maybeSingle()
    if (adminError || !adminRow || !adminRow.is_active) {
      await supabase.auth.signOut()
      setError('This account is not authorized to access the CRM.')
      setLoading(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 font-black backdrop-blur">M</div>
          <span className="font-bold">MyPrimeCompany</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-black leading-tight">Operations,<br />under control.</h1>
          <p className="mt-4 max-w-sm text-primary-foreground/70">
            The internal console for orders, customers, vendors, pricing and invoicing — one source of truth.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/85">
            {['Bookings & scheduling in real time', 'Vendor onboarding & assignment', 'Invoicing with payment tracking'].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-accent" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/50">© {new Date().getFullYear()} MyPrimeCompany · Admin access only</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary font-black text-primary-foreground">M</div>
            <h1 className="text-xl font-black">MyPrimeCompany</h1>
          </div>

          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Lock className="h-4 w-4 text-primary" /> Sign in
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Admin access only. Accounts are provisioned by a super admin.</p>
          </div>

          {!configured && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Supabase isn&apos;t configured yet. Add your keys to <code>apps/crm/.env.local</code>.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@primehomecare.in" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
            </div>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading || !configured}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">Trouble signing in? Contact your administrator.</p>
        </div>
      </div>
    </div>
  )
}

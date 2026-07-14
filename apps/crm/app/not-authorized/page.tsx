'use client'

import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotAuthorizedPage() {
  const router = useRouter()

  async function signOut() {
    if (isSupabaseConfigured()) {
      await createClient().auth.signOut()
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle>Not authorized</CardTitle>
          <CardDescription>
            You&apos;re signed in, but this account isn&apos;t an active CRM admin. Ask a super
            admin to provision your access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

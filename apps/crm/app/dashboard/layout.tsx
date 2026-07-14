import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAuthEnv } from '@/lib/env'
import CrmShell, { type ShellAdmin } from '@/components/crm-shell'

/**
 * Authorization gate for the whole /dashboard subtree.
 *   • not signed in            → /login (also enforced in the route guard)
 *   • signed in but not admin  → /not-authorized (breaks any redirect loop)
 *   • Supabase not configured  → local dev preview (shell renders, admin = null);
 *     unreachable in production, where supabaseAuthEnv() throws instead.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const configured = supabaseAuthEnv() !== null
  let admin: ShellAdmin | null = null

  if (configured) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase
      .from('admin_users')
      .select('full_name, email, role, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (!data || !data.is_active) redirect('/not-authorized')
    admin = {
      full_name: data.full_name,
      email: data.email,
      role: data.role as ShellAdmin['role'],
    }
  }

  return (
    <CrmShell admin={admin} configured={configured}>
      {children}
    </CrmShell>
  )
}

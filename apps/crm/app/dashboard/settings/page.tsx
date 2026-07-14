import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CitiesManager, CategoriesManager, AdminsManager } from '@/components/settings/managers'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('admin_users').select('role').eq('id', user.id).single()
  if (me?.role !== 'super_admin') redirect('/dashboard')

  const [{ data: cities }, { data: categories }, { data: admins }] = await Promise.all([
    supabase.from('cities').select('id,name,is_active').order('name'),
    supabase.from('service_categories').select('id,name,slug,icon,sort_order').order('sort_order'),
    supabase.from('admin_users').select('id,full_name,email,role,is_active').order('created_at'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="text-muted-foreground">Super-admin controls for the business configuration</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CitiesManager cities={cities ?? []} />
        <CategoriesManager categories={categories ?? []} />
      </div>

      <AdminsManager admins={admins ?? []} currentUserId={user.id} />
    </div>
  )
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminRole } from '@prime/shared'

type Result = { error: string } | { ok: true }
type ResultWith<T> = { error: string } | ({ ok: true } & T)

/** Gate every settings mutation on an active super_admin session. */
async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('admin_users').select('role,is_active').eq('id', user.id).single()
  if (!data || data.is_active !== true || data.role !== 'super_admin') return null
  return { user, supabase }
}

export async function addCity(name: string): Promise<Result> {
  const ctx = await requireSuperAdmin()
  if (!ctx) return { error: 'Not authorized' }
  if (!name.trim()) return { error: 'City name is required' }
  const { error } = await ctx.supabase.from('cities').insert({ name: name.trim() })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { ok: true }
}

export async function toggleCity(id: string, is_active: boolean): Promise<Result> {
  const ctx = await requireSuperAdmin()
  if (!ctx) return { error: 'Not authorized' }
  const { error } = await ctx.supabase.from('cities').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { ok: true }
}

export async function addCategory(input: {
  name: string
  slug: string
  icon: string
  sort_order: number
}): Promise<Result> {
  const ctx = await requireSuperAdmin()
  if (!ctx) return { error: 'Not authorized' }
  if (!input.name.trim() || !input.slug.trim()) return { error: 'Name and slug are required' }
  const { error } = await ctx.supabase.from('service_categories').insert({
    name: input.name.trim(),
    slug: input.slug.trim(),
    icon: input.icon.trim() || null,
    sort_order: input.sort_order,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { ok: true }
}

/** Provision a staff/admin account: creates the auth user + admin_users row. */
export async function inviteAdmin(input: {
  email: string
  full_name: string
  role: AdminRole
}): Promise<ResultWith<{ password: string }>> {
  const ctx = await requireSuperAdmin()
  if (!ctx) return { error: 'Not authorized' }
  const email = input.email.trim().toLowerCase()
  if (!email || !input.full_name.trim()) return { error: 'Name and email are required' }

  const admin = createAdminClient()
  const password = `Phc-${Math.random().toString(36).slice(2, 10)}!`

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !created.user) return { error: error?.message ?? 'Could not create the auth user' }

  const { error: rowErr } = await admin.from('admin_users').insert({
    id: created.user.id,
    full_name: input.full_name.trim(),
    email,
    role: input.role,
    is_active: true,
  })
  if (rowErr) return { error: rowErr.message }

  revalidatePath('/dashboard/settings')
  return { ok: true, password }
}

export async function toggleAdminActive(id: string, is_active: boolean): Promise<Result> {
  const ctx = await requireSuperAdmin()
  if (!ctx) return { error: 'Not authorized' }
  if (id === ctx.user.id) return { error: 'You cannot deactivate your own account' }
  const { error } = await ctx.supabase.from('admin_users').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { ok: true }
}

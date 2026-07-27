'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { AdminRole } from '@prime/shared'
import {
  addCity, toggleCity, addCategory, inviteAdmin, toggleAdminActive,
} from '@/app/dashboard/settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Cities ───────────────────────────────────────────────────────────────────

export function CitiesManager({ cities }: { cities: { id: string; name: string; is_active: boolean | null }[] }) {
  const [items, setItems] = useState(cities)
  const [name, setName] = useState('')
  const [, start] = useTransition()
  useEffect(() => setItems(cities), [cities])

  function add() {
    if (!name.trim()) return
    start(async () => {
      const r = await addCity(name)
      if ('error' in r) toast.error(r.error)
      else {
        toast.success('City added')
        setName('')
      }
    })
  }
  function toggle(id: string, v: boolean) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: v } : c)))
    start(async () => {
      const r = await toggleCity(id, v)
      if ('error' in r) toast.error(r.error)
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Cities served</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Add a city…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button onClick={add}><Plus className="h-4 w-4" /> Add</Button>
        </div>
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span className={c.is_active ? '' : 'text-muted-foreground line-through'}>{c.name}</span>
              <Switch checked={!!c.is_active} onCheckedChange={(v) => toggle(c.id, v)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Categories ─────────────────────────────────────────────────────────────

export function CategoriesManager({ categories }: { categories: { id: string; name: string; slug: string; icon: string | null; sort_order: number | null }[] }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [icon, setIcon] = useState('')
  const [, start] = useTransition()

  function add() {
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug required')
      return
    }
    start(async () => {
      const r = await addCategory({ name, slug, icon, sort_order: categories.length + 1 })
      if ('error' in r) toast.error(r.error)
      else {
        toast.success('Category added')
        setName('')
        setSlug('')
        setIcon('')
      }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Service categories</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value.trimStart())} />
          <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Input placeholder="Lucide icon (e.g. Sparkles)" value={icon} onChange={(e) => setIcon(e.target.value)} className="col-span-2" />
        </div>
        <Button onClick={add} className="w-full"><Plus className="h-4 w-4" /> Add category</Button>
        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">/{c.slug} · {c.icon ?? '—'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Admins ──────────────────────────────────────────────────────────────────

const ROLES: AdminRole[] = ['staff', 'admin', 'super_admin']

export function AdminsManager({
  admins,
  currentUserId,
}: {
  admins: { id: string; full_name: string; email: string; role: string; is_active: boolean | null }[]
  currentUserId: string
}) {
  const [items, setItems] = useState(admins)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<AdminRole>('staff')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [, start] = useTransition()
  useEffect(() => setItems(admins), [admins])

  function invite() {
    if (!email.trim() || !fullName.trim()) {
      toast.error('Name and email required')
      return
    }
    setTempPassword(null)
    start(async () => {
      const r = await inviteAdmin({ email, full_name: fullName, role })
      if ('error' in r) toast.error(r.error)
      else {
        toast.success('Admin created')
        setTempPassword(r.password)
        setEmail('')
        setFullName('')
        setRole('staff')
      }
    })
  }
  function toggle(id: string, v: boolean) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: v } : a)))
    start(async () => {
      const r = await toggleAdminActive(id, v)
      if ('error' in r) {
        toast.error(r.error)
        setItems((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !v } : a)))
      }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Admin users</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <div>
            <Label className="mb-1 block text-xs">Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Staff name" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@myprimecompany.in" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className="w-32">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <Button onClick={invite}><Plus className="h-4 w-4" /> Invite</Button>
        </div>

        {tempPassword && (
          <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
            Account created. Temporary password: <code className="font-bold">{tempPassword}</code> — share it securely; they should change it after first login.
          </div>
        )}

        <div className="space-y-1.5">
          {items.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">
                  {a.full_name} {a.id === currentUserId && <span className="text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{a.role}</Badge>
                <Switch checked={!!a.is_active} onCheckedChange={(v) => toggle(a.id, v)} disabled={a.id === currentUserId} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

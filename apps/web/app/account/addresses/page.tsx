'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapPin, Loader2, Plus, Trash2, Star, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useCity } from '@/lib/city-context'
import type { Address } from '@prime/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export default function AddressesPage() {
  const { user } = useAuth()
  const { cities } = useCity()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: cust }, { data: addr }] = await Promise.all([
      supabase.from('customers').select('id').maybeSingle(),
      supabase.from('addresses').select('*').order('is_default', { ascending: false }),
    ])
    setCustomerId(cust?.id ?? null)
    setAddresses((addr as Address[]) ?? [])
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  async function remove(a: Address) {
    if (!confirm('Delete this address?')) return
    const { error } = await createClient().from('addresses').delete().eq('id', a.id)
    if (error) setError(error.message); else await load()
  }
  async function makeDefault(a: Address) {
    const supabase = createClient()
    if (customerId) await supabase.from('addresses').update({ is_default: false }).eq('customer_id', customerId)
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', a.id)
    if (error) setError(error.message); else await load()
  }

  if (!addresses) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {addresses.length === 0 && !adding && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 grid place-items-center mb-4"><MapPin className="w-8 h-8 text-primary" /></div>
          <p className="font-bold text-gray-800">No saved addresses</p>
          <p className="text-gray-500 text-sm mt-1">Save an address to check out faster next time.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <Card key={a.id} className="rounded-2xl py-4">
            <CardContent className="px-4">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Home className="size-3.5" /> {a.label || 'Address'}
                  {a.is_default && (
                    <Badge className="ml-1 rounded-full bg-primary/10 text-primary">Default</Badge>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(a)}
                  aria-label="Delete address"
                  className="text-muted-foreground/60 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-sm text-foreground">{a.full_address}</p>
              <p className="text-xs text-muted-foreground">{a.city}</p>
              {!a.is_default && (
                <Button
                  variant="link"
                  onClick={() => makeDefault(a)}
                  className="mt-3 h-auto gap-1 p-0 text-xs font-semibold"
                >
                  <Star className="size-3.5" /> Set as default
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {adding ? (
        <AddressForm
          cities={cities}
          customerId={customerId}
          isFirst={addresses.length === 0}
          onCancel={() => setAdding(false)}
          onSaved={async () => { setAdding(false); await load() }}
        />
      ) : (
        <Button onClick={() => setAdding(true)} className="rounded-xl font-semibold">
          <Plus /> Add address
        </Button>
      )}
    </div>
  )
}

function AddressForm({
  cities, customerId, isFirst, onCancel, onSaved,
}: {
  cities: string[]
  customerId: string | null
  isFirst: boolean
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const [label, setLabel] = useState('Home')
  const [full, setFull] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!full.trim() || !city) { setError('Address and city are required'); return }
    if (!customerId) { setError('Place a booking first to create your profile'); return }
    setBusy(true); setError(null)
    const { error } = await createClient().from('addresses').insert({
      customer_id: customerId, label: label.trim() || 'Home', full_address: full.trim(), city, is_default: isFirst,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    await onSaved()
  }

  return (
    <Card className="rounded-2xl py-4">
      <CardContent className="space-y-3 px-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="addr-label" className="text-xs text-muted-foreground">Label</Label>
            <Input id="addr-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home / Office" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="addr-city" className="text-xs text-muted-foreground">City</Label>
            <Select value={city || undefined} onValueChange={setCity}>
              <SelectTrigger id="addr-city" className="w-full">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="addr-full" className="text-xs text-muted-foreground">Full address</Label>
          <Textarea id="addr-full" rows={2} value={full} onChange={(e) => setFull(e.target.value)} placeholder="Flat / House No., Street, Area" className="resize-none" />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy} className="font-semibold">
            {busy && <Loader2 className="animate-spin" />} Save address
          </Button>
          <Button variant="ghost" onClick={onCancel} className="text-muted-foreground">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  )
}

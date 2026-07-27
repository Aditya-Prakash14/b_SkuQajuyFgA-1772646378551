'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapPin, Loader2, Plus, Trash2, Star, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useCity } from '@/lib/city-context'
import type { Address } from '@prime/shared'

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
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {addresses.length === 0 && !adding && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 grid place-items-center mb-4"><MapPin className="w-8 h-8 text-primary" /></div>
          <p className="font-bold text-gray-800">No saved addresses</p>
          <p className="text-gray-500 text-sm mt-1">Save an address to check out faster next time.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <Home className="w-3.5 h-3.5" /> {a.label || 'Address'}
                {a.is_default && <span className="ml-1 rounded-full bg-primary/10 text-primary px-2 py-0.5">Default</span>}
              </span>
              <button onClick={() => remove(a)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="mt-2 text-sm text-gray-700">{a.full_address}</p>
            <p className="text-xs text-gray-400">{a.city}</p>
            {!a.is_default && (
              <button onClick={() => makeDefault(a)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Star className="w-3.5 h-3.5" /> Set as default
              </button>
            )}
          </div>
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
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add address
        </button>
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
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-500 mb-1">Label</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home / Office" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-500 mb-1">City</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select city</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <label className="text-sm block">
        <span className="block text-xs font-semibold text-gray-500 mb-1">Full address</span>
        <textarea rows={2} value={full} onChange={(e) => setFull(e.target.value)} placeholder="Flat / House No., Street, Area" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
      </label>
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save address
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
      </div>
    </div>
  )
}

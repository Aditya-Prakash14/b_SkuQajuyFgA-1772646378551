'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Vendor, VendorStatus, VendorDocument } from '@prime/shared'
import { createVendor, updateVendor, type VendorInput } from '@/app/dashboard/vendors/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATUSES: VendorStatus[] = ['pending', 'approved', 'active', 'suspended', 'rejected']

export function VendorForm({
  mode,
  vendorId,
  initial,
  services,
  cities,
}: {
  mode: 'create' | 'edit'
  vendorId?: string
  initial?: Vendor
  services: { id: string; name: string }[]
  cities: string[]
}) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [status, setStatus] = useState<VendorStatus>((initial?.status as VendorStatus) ?? 'pending')
  const [commission, setCommission] = useState<number>(Number(initial?.commission_rate ?? 0))
  const [serviceIds, setServiceIds] = useState<string[]>(initial?.services_offered ?? [])
  const [docs, setDocs] = useState<VendorDocument[]>((initial?.documents as VendorDocument[] | null) ?? [])
  const [submitting, setSubmitting] = useState(false)

  const toggleService = (id: string) =>
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const addDoc = () => setDocs((prev) => [...prev, { type: '', url: '', verified: false }])
  const patchDoc = (i: number, patch: Partial<VendorDocument>) =>
    setDocs((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  const removeDoc = (i: number) => setDocs((prev) => prev.filter((_, idx) => idx !== i))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const input: VendorInput = {
      name,
      phone,
      email: email || null,
      city: city || null,
      status,
      commission_rate: Number(commission) || 0,
      services_offered: serviceIds,
      documents: docs.filter((d) => d.type.trim() || d.url.trim()),
    }
    const res = mode === 'create' ? await createVendor(input) : await updateVendor(vendorId!, input)
    if (res && 'error' in res) {
      toast.error(res.error)
      setSubmitting(false)
      return
    }
    if (mode === 'edit') {
      toast.success('Vendor saved')
      router.refresh()
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" type="button">
            <Link href="/dashboard/vendors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black">{mode === 'create' ? 'New vendor' : initial?.name}</h1>
            <p className="text-muted-foreground">Field partner details</p>
          </div>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === 'create' ? 'Create vendor' : 'Save changes'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor / company name" />
              </div>
              <div>
                <Label className="mb-1.5 block">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile" />
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
              </div>
              <div>
                <Label className="mb-1.5 block">City</Label>
                <Select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">Select city</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Status</Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value as VendorStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Commission rate (%)</Label>
                <Input type="number" step="0.1" min="0" max="100" value={commission} onChange={(e) => setCommission(Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {docs.map((d, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto_auto] sm:items-center">
                  <Input placeholder="Type (ID proof…)" value={d.type} onChange={(e) => patchDoc(i, { type: e.target.value })} />
                  <Input placeholder="URL" value={d.url} onChange={(e) => patchDoc(i, { url: e.target.value })} />
                  <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground">
                    <input type="checkbox" checked={d.verified} onChange={(e) => patchDoc(i, { verified: e.target.checked })} />
                    Verified
                  </label>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeDoc(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addDoc}>
                <Plus className="h-4 w-4" /> Add document
              </Button>
              <p className="text-xs text-muted-foreground">
                Paste a URL for now; direct upload to the private <code>vendor-docs</code> bucket is a follow-up.
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Services offered</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                    {s.name}
                  </label>
                ))}
                {services.length === 0 && <p className="text-sm text-muted-foreground">No services yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

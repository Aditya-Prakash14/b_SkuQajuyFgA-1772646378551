'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Phone, MapPin, ShieldCheck, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import type { OnboardingStep, VendorStatus } from '@prime/shared'
import { updateVendorStatus } from '@/app/dashboard/vendors/actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export interface VendorCard {
  id: string
  name: string
  phone: string
  city: string
  status: VendorStatus
  commission: number
  servicesCount: number
  onboardingStep: OnboardingStep
  submittedAt: string | null
  hasAppAccount: boolean
  docsAwaitingReview: number
}

const COLUMNS: { status: VendorStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'approved', label: 'Approved' },
  { status: 'active', label: 'Active' },
  { status: 'suspended', label: 'Suspended' },
  { status: 'rejected', label: 'Rejected' },
]

const ALL_STATUSES: VendorStatus[] = ['pending', 'approved', 'active', 'suspended', 'rejected']

const STEP_SHORT: Record<OnboardingStep, string> = {
  profile: 'Profile',
  documents: 'Documents',
  review: 'Review',
  done: 'Done',
}

export function VendorsBoard({ vendors }: { vendors: VendorCard[] }) {
  const [items, setItems] = useState(vendors)
  const [, start] = useTransition()

  function move(id: string, status: VendorStatus) {
    const prev = items
    setItems((list) => list.map((v) => (v.id === id ? { ...v, status } : v)))
    start(async () => {
      const r = await updateVendorStatus(id, status)
      if ('error' in r) {
        toast.error(r.error)
        setItems(prev)
      } else {
        toast.success(`Moved to ${status}`)
      }
    })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const cards = items.filter((v) => v.status === col.status)
        return (
          <div key={col.status} className="flex w-72 shrink-0 flex-col">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-bold">{col.label}</h3>
              <Badge variant="secondary">{cards.length}</Badge>
            </div>
            <div className="flex-1 space-y-3 rounded-xl bg-muted/40 p-2">
              {cards.map((v) => {
                const needsReview =
                  v.onboardingStep === 'review' && (v.status === 'pending' || v.status === 'rejected')
                return (
                  <div key={v.id} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/dashboard/vendors/${v.id}`} className="font-medium hover:text-primary">
                        {v.name}
                      </Link>
                      {v.hasAppAccount ? (
                        <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Uses the partner app" />
                      ) : null}
                    </div>
                    <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {v.phone}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {v.city} · {v.servicesCount} services · {v.commission}%
                      </p>
                    </div>

                    {v.hasAppAccount || v.onboardingStep !== 'profile' ? (
                      <Link
                        href={`/dashboard/vendors/${v.id}`}
                        className="mt-2 flex items-center gap-1.5 text-xs"
                        title="Open KYC review"
                      >
                        <ShieldCheck className={needsReview ? 'h-3.5 w-3.5 text-warning' : 'h-3.5 w-3.5 text-muted-foreground'} />
                        <Badge variant={needsReview ? 'warning' : v.onboardingStep === 'done' ? 'success' : 'secondary'}>
                          {needsReview ? 'Review needed' : `KYC: ${STEP_SHORT[v.onboardingStep]}`}
                        </Badge>
                        {v.docsAwaitingReview ? (
                          <span className="text-muted-foreground">{v.docsAwaitingReview} doc{v.docsAwaitingReview === 1 ? '' : 's'} to check</span>
                        ) : null}
                      </Link>
                    ) : null}

                    <Select value={v.status} onValueChange={(val) => move(v.id, val as VendorStatus)}>
                      <SelectTrigger size="sm" className="mt-2 w-full capitalize text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
              {cards.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">Empty</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

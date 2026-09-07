'use client'

import { useState } from 'react'
import { Loader2, Save, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

export interface PrimeNowSlotRow {
  id: string
  label: string
  sublabel: string
  minutes: number
  price: number
  is_active: boolean
}

/**
 * Prime Now price list. This edits prime_now_slots directly (RLS: admins
 * only) — create_prime_now_request() prices every request from this table,
 * and the website + customer app display from it, so a change here is the
 * change, everywhere, immediately.
 */
export function PrimeNowSlotPricing({ slots }: { slots: PrimeNowSlotRow[] }) {
  const [rows, setRows] = useState(slots)
  const [saving, setSaving] = useState<string | null>(null)
  const baseline = useState(() => new Map(slots.map((s) => [s.id, JSON.stringify(s)])))[0]

  const patch = (id: string, changes: Partial<PrimeNowSlotRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...changes } : r)))

  const isDirty = (row: PrimeNowSlotRow) => baseline.get(row.id) !== JSON.stringify(row)

  async function save(row: PrimeNowSlotRow) {
    if (!Number.isFinite(row.price) || row.price < 0) {
      toast.error('Price must be a positive number')
      return
    }
    setSaving(row.id)
    const { error } = await createClient()
      .from('prime_now_slots')
      .update({
        label: row.label.trim(),
        sublabel: row.sublabel.trim(),
        price: row.price,
        is_active: row.is_active,
      })
      .eq('id', row.id)
    setSaving(null)
    if (error) {
      toast.error(`Could not save: ${error.message}`)
      return
    }
    baseline.set(row.id, JSON.stringify(row))
    setRows((rs) => [...rs]) // re-render dirty state
    toast.success(`${row.label} saved — live on the website and app now`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Prime Now pricing
        </CardTitle>
        <CardDescription>
          Slot rates for on-demand hourly help. Every request is priced server-side from this
          table; the website and customer app display it. Switching a slot off hides it and
          refuses new requests for it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Slot</TH>
              <TH>Subtitle</TH>
              <TH className="w-24">Minutes</TH>
              <TH className="w-32">Price (₹)</TH>
              <TH className="w-20">Active</TH>
              <TH className="w-24" />
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD>
                  <Input value={row.label} onChange={(e) => patch(row.id, { label: e.target.value })} />
                </TD>
                <TD>
                  <Input value={row.sublabel} onChange={(e) => patch(row.id, { sublabel: e.target.value })} />
                </TD>
                <TD className="tabular text-muted-foreground">{row.minutes}</TD>
                <TD>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={Number.isFinite(row.price) ? row.price : ''}
                    onChange={(e) => patch(row.id, { price: e.target.valueAsNumber })}
                    className="tabular"
                  />
                </TD>
                <TD>
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(v) => patch(row.id, { is_active: v })}
                    aria-label={`${row.label} active`}
                  />
                </TD>
                <TD>
                  <Button size="sm" disabled={!isDirty(row) || saving === row.id} onClick={() => save(row)}>
                    {saving === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  )
}

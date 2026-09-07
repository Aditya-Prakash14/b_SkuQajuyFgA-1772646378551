'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { useCity } from '@/lib/city-context'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export function PartnerForm() {
  const { cities } = useCity()
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', note: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number'
    if (!form.city) e.city = 'Please select a city'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setApiError(null)
    try {
      const supabase = createPublicClient()
      const { error } = await supabase.rpc('submit_vendor_application', {
        p_name: form.name,
        p_phone: form.phone,
        // '' is normalised to NULL by nullif(trim(...), '') in the RPC.
        p_email: form.email || '',
        p_city: form.city,
        p_note: form.note || undefined,
      })
      if (error) throw error
      setDone(true)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please call us instead.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-foreground">
            <CheckCircle2 className="size-7" />
          </div>
          <CardTitle className="text-xl">Application received</CardTitle>
          <CardDescription className="leading-relaxed">
            Thanks, <strong className="text-foreground">{form.name}</strong>. Our onboarding team will
            review your application and call you at{' '}
            <strong className="text-foreground">{form.phone}</strong> within 2–3 working days.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          {apiError && (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="name" label="Full name / Company" error={errors.name}>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Your name or company"
                aria-invalid={!!errors.name}
              />
            </Field>

            <Field id="phone" label="Mobile number" error={errors.phone}>
              <Input
                id="phone"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                placeholder="10-digit mobile"
                aria-invalid={!!errors.phone}
              />
            </Field>

            <Field id="email" label="Email (optional)">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field id="city" label="City" error={errors.city}>
              {/* Radix Select reserves "" for "no value", so an unset city stays
                  undefined and the placeholder renders instead. */}
              <Select value={form.city || undefined} onValueChange={(v) => set('city', v)}>
                <SelectTrigger id="city" className="w-full" aria-invalid={!!errors.city}>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field id="note" label="Services you offer & experience">
            <Textarea
              id="note"
              rows={4}
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="e.g. Deep cleaning and sofa shampooing, 4 years experience, team of 6, own equipment"
              className="resize-none"
            />
          </Field>

          <Button type="submit" variant="brand" size="lg" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            {submitting ? 'Submitting…' : 'Submit application'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By applying you agree to a background verification check.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

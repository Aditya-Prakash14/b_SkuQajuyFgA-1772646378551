'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, Send } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { useCity } from '@/lib/city-context'

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
      <div className="bg-white border border-green-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 text-green-600 grid place-items-center mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-gray-900">Application received</h3>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          Thanks, <strong>{form.name}</strong>. Our onboarding team will review your application and call
          you at <strong>{form.phone}</strong> within 2–3 working days.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
      {apiError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{apiError}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name / Company" error={errors.name}>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Your name or company"
            className={input(errors.name)}
          />
        </Field>
        <Field label="Mobile number" error={errors.phone}>
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
            maxLength={10}
            placeholder="10-digit mobile"
            className={input(errors.phone)}
          />
        </Field>
        <Field label="Email (optional)">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="you@example.com"
            className={input()}
          />
        </Field>
        <Field label="City" error={errors.city}>
          <select value={form.city} onChange={(e) => set('city', e.target.value)} className={input(errors.city)}>
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Services you offer & experience">
        <textarea
          rows={4}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="e.g. Deep cleaning and sofa shampooing, 4 years experience, team of 6, own equipment"
          className={`${input()} resize-none`}
        />
      </Field>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-colors shadow-md shadow-accent/30 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        By applying you agree to a background verification check.
      </p>
    </form>
  )
}

function input(error?: string) {
  return `w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors bg-white ${
    error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary'
  }`
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

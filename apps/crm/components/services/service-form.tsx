'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useForm, useFieldArray, useWatch, Controller,
  type Control, type UseFormRegister,
} from 'react-hook-form'
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { priceLabel, type PriceUnit, type Service } from '@prime/shared'
import { createService, updateService, deleteService, type ServiceInput } from '@/app/dashboard/services/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FormValues {
  slug: string
  name: string
  tagline: string
  category_id: string
  price: number
  price_unit: PriceUnit
  display_price_label: string
  duration: string
  hero_img: string
  description: string
  rating: number
  reviews_count: number
  bookings_count: string
  is_active: boolean
  gallery_imgs: { value: string }[]
  what_we_clean: { value: string }[]
  whats_included: { value: string }[]
  not_included: { value: string }[]
  how_it_works: { step: number; title: string; desc: string }[]
  faqs: { q: string; a: string }[]
  related_service_ids: string[]
}

type StringArrayName = 'gallery_imgs' | 'what_we_clean' | 'whats_included' | 'not_included'
const wrap = (arr?: string[]) => (arr ?? []).map((value) => ({ value }))

// react-hook-form v7 Control takes <TFieldValues, TContext, TTransformedValues>;
// useForm<FormValues, unknown, FormValues> produces exactly this.
type FormControl = Control<FormValues, unknown, FormValues>

export function ServiceForm({
  mode,
  serviceId,
  initial,
  categories,
  allServices,
}: {
  mode: 'create' | 'edit'
  serviceId?: string
  initial?: Service
  categories: { id: string; name: string }[]
  allServices: { id: string; name: string; slug: string }[]
}) {
  const router = useRouter()

  const {
    register, control, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormValues>({
    defaultValues: {
      slug: initial?.slug ?? '',
      name: initial?.name ?? '',
      tagline: initial?.tagline ?? '',
      category_id: initial?.category_id ?? '',
      price: initial?.price ?? 0,
      price_unit: (initial?.price_unit as PriceUnit) ?? 'fixed',
      display_price_label: initial?.display_price_label ?? '',
      duration: initial?.duration ?? '',
      hero_img: initial?.hero_img ?? '',
      description: initial?.description ?? '',
      rating: initial?.rating ?? 4.5,
      reviews_count: initial?.reviews_count ?? 0,
      bookings_count: initial?.bookings_count ?? '0',
      is_active: initial?.is_active ?? true,
      // jsonb columns come back as `Json` from the generated types.
      gallery_imgs: wrap(initial?.gallery_imgs as string[] | undefined),
      what_we_clean: wrap(initial?.what_we_clean as string[] | undefined),
      whats_included: wrap(initial?.whats_included as string[] | undefined),
      not_included: wrap(initial?.not_included as string[] | undefined),
      how_it_works: (initial?.how_it_works as unknown as FormValues['how_it_works']) ?? [],
      faqs: (initial?.faqs as unknown as FormValues['faqs']) ?? [],
      related_service_ids: initial?.related_service_ids ?? [],
    },
  })

  const steps = useFieldArray({ control, name: 'how_it_works' })
  const faqs = useFieldArray({ control, name: 'faqs' })

  // useWatch (not watch()) — the memoizable, React-Compiler-safe API.
  const price = useWatch({ control, name: 'price' })
  const unit = useWatch({ control, name: 'price_unit' })

  async function onSubmit(v: FormValues) {
    const input: ServiceInput = {
      slug: v.slug,
      name: v.name,
      tagline: v.tagline || null,
      category_id: v.category_id || null,
      price: Number(v.price) || 0,
      price_unit: v.price_unit,
      display_price_label: v.display_price_label.trim() || priceLabel(Number(v.price) || 0, v.price_unit),
      duration: v.duration || null,
      hero_img: v.hero_img || null,
      gallery_imgs: v.gallery_imgs.map((g) => g.value.trim()).filter(Boolean),
      description: v.description || null,
      what_we_clean: v.what_we_clean.map((x) => x.value.trim()).filter(Boolean),
      how_it_works: v.how_it_works
        .filter((s) => s.title.trim())
        .map((s, i) => ({ step: i + 1, title: s.title.trim(), desc: s.desc.trim() })),
      whats_included: v.whats_included.map((x) => x.value.trim()).filter(Boolean),
      not_included: v.not_included.map((x) => x.value.trim()).filter(Boolean),
      faqs: v.faqs.filter((f) => f.q.trim()).map((f) => ({ q: f.q.trim(), a: f.a.trim() })),
      related_service_ids: v.related_service_ids,
      rating: Number(v.rating) || 4.5,
      reviews_count: Number(v.reviews_count) || 0,
      bookings_count: v.bookings_count || '0',
      is_active: v.is_active,
    }

    const res = mode === 'create' ? await createService(input) : await updateService(serviceId!, input)
    if (res && 'error' in res) {
      toast.error(res.error)
      return
    }
    if (mode === 'edit') {
      toast.success('Service saved')
      router.refresh()
    }
  }

  async function onDelete() {
    if (!serviceId) return
    if (!confirm('Delete this service? This cannot be undone.')) return
    const res = await deleteService(serviceId)
    if (res && 'error' in res) toast.error(res.error)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" type="button">
            <Link href="/dashboard/services">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black">
              {mode === 'create' ? 'New service' : initial?.name}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'create' ? 'Add a service to the catalog' : `/${initial?.slug}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'edit' && (
            <Button type="button" variant="outline" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === 'create' ? 'Create service' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Basics */}
          <Card>
            <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={errors.name?.message}>
                <Input {...register('name', { required: 'Name is required' })} placeholder="Home Deep Cleaning" />
              </Field>
              <Field label="Slug" error={errors.slug?.message} hint="URL path, e.g. home-deep-cleaning">
                <Input {...register('slug', { required: 'Slug is required' })} placeholder="home-deep-cleaning" />
              </Field>
              <Field label="Tagline" className="sm:col-span-2">
                <Input {...register('tagline')} placeholder="Thorough top-to-bottom cleaning…" />
              </Field>
              <Field label="Category">
                <Select {...register('category_id')}>
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Duration" hint="e.g. 4–6 hours">
                <Input {...register('duration')} placeholder="4–6 hours" />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea rows={4} {...register('description')} placeholder="What this service covers…" />
              </Field>
            </CardContent>
          </Card>

          {/* Content lists */}
          <Card>
            <CardHeader><CardTitle>What we cover</CardTitle></CardHeader>
            <CardContent>
              <StringListField control={control} register={register} name="what_we_clean" placeholder="All floors — swept, mopped, scrubbed" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>How it works</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {steps.fields.map((f, i) => (
                <div key={f.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_2fr_auto]">
                  <Input placeholder="Step title" {...register(`how_it_works.${i}.title` as const)} />
                  <Input placeholder="Description" {...register(`how_it_works.${i}.desc` as const)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => steps.remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => steps.append({ step: steps.fields.length + 1, title: '', desc: '' })}>
                <Plus className="h-4 w-4" /> Add step
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-green-700">Included</CardTitle></CardHeader>
              <CardContent>
                <StringListField control={control} register={register} name="whats_included" placeholder="Eco-friendly cleaning agents" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-red-600">Not included</CardTitle></CardHeader>
              <CardContent>
                <StringListField control={control} register={register} name="not_included" placeholder="Pest control" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {faqs.fields.map((f, i) => (
                <div key={f.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex gap-2">
                    <Input placeholder="Question" {...register(`faqs.${i}.q` as const)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => faqs.remove(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea rows={2} placeholder="Answer" {...register(`faqs.${i}.a` as const)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => faqs.append({ q: '', a: '' })}>
                <Plus className="h-4 w-4" /> Add FAQ
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Price (₹)" error={errors.price?.message}>
                <Input type="number" step="0.01" min="0" {...register('price', { required: 'Price is required', valueAsNumber: true, min: 0 })} />
              </Field>
              <Field label="Price unit">
                <Select {...register('price_unit')}>
                  <option value="fixed">Fixed</option>
                  <option value="per_sqft">Per sq. ft.</option>
                  <option value="per_panel">Per panel</option>
                  <option value="per_seat">Per seat</option>
                </Select>
              </Field>
              <Field label="Display label" hint={`Auto: ${priceLabel(Number(price) || 0, unit)}`}>
                <Input {...register('display_price_label')} placeholder={priceLabel(Number(price) || 0, unit)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Visibility &amp; stats</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Active</p>
                      <p className="text-xs text-muted-foreground">Shown on the website</p>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
              <Field label="Rating">
                <Input type="number" step="0.1" min="0" max="5" {...register('rating', { valueAsNumber: true })} />
              </Field>
              <Field label="Reviews count">
                <Input type="number" min="0" {...register('reviews_count', { valueAsNumber: true })} />
              </Field>
              <Field label="Bookings label" hint='Display string e.g. "1L+"'>
                <Input {...register('bookings_count')} placeholder="1L+" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Images</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Hero image" hint="Path or URL">
                <Input {...register('hero_img')} placeholder="/fan%20cleaning%20PC.jpg" />
              </Field>
              <StringListField control={control} register={register} name="gallery_imgs" label="Gallery images" placeholder="/image.jpg" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Related services</CardTitle></CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="related_service_ids"
                render={({ field }) => (
                  <ScrollArea className="h-56 pr-3">
                    <div className="space-y-1">
                      {allServices.map((s) => {
                        const checked = field.value.includes(s.id)
                        return (
                          <Label
                            key={s.id}
                            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-normal hover:bg-accent"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                field.onChange(
                                  checked ? field.value.filter((x) => x !== s.id) : [...field.value, s.id],
                                )
                              }
                            />
                            {s.name}
                          </Label>
                        )
                      })}
                      {allServices.length === 0 && (
                        <p className="text-sm text-muted-foreground">No other services yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, error, hint, className, children,
}: {
  label: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

// ─── Repeatable string list ───────────────────────────────────────────────────

function StringListField({
  control, register, name, label, placeholder,
}: {
  control: FormControl
  register: UseFormRegister<FormValues>
  name: StringArrayName
  label?: string
  placeholder: string
}) {
  const { fields, append, remove } = useFieldArray({ control, name })
  return (
    <div className="space-y-2">
      {label && <Label className="block">{label}</Label>}
      {fields.map((f, i) => (
        <div key={f.id} className="flex gap-2">
          <Input placeholder={placeholder} {...register(`${name}.${i}.value` as const)} />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </div>
  )
}

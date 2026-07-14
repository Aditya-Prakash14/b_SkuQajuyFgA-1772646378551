import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@prime/shared'
import { ServiceForm } from '@/components/services/service-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: service } = await supabase.from('services').select('*').eq('id', id).single()
  if (!service) notFound()

  const [{ data: categories }, { data: allServices }, { data: history }] = await Promise.all([
    supabase.from('service_categories').select('id,name').order('sort_order'),
    supabase.from('services').select('id,name,slug').neq('id', id).order('name'),
    supabase
      .from('price_history')
      .select('id, old_price, new_price, changed_at, changed_by_admin:admin_users(full_name)')
      .eq('service_id', id)
      .order('changed_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <ServiceForm
        mode="edit"
        serviceId={id}
        initial={service}
        categories={categories ?? []}
        allServices={allServices ?? []}
      />

      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Price history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                <div>
                  <span className="text-muted-foreground line-through">{formatINR(Number(h.old_price ?? 0))}</span>
                  <span className="mx-2">→</span>
                  <span className="font-semibold">{formatINR(Number(h.new_price ?? 0))}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {(h.changed_by_admin as { full_name: string } | null)?.full_name ?? 'System'} ·{' '}
                  {h.changed_at ? new Date(h.changed_at).toLocaleString('en-IN') : '—'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

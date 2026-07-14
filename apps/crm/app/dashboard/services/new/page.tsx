import { createClient } from '@/lib/supabase/server'
import { ServiceForm } from '@/components/services/service-form'

export default async function NewServicePage() {
  const supabase = await createClient()
  const [{ data: categories }, { data: allServices }] = await Promise.all([
    supabase.from('service_categories').select('id,name').order('sort_order'),
    supabase.from('services').select('id,name,slug').order('name'),
  ])

  return (
    <ServiceForm mode="create" categories={categories ?? []} allServices={allServices ?? []} />
  )
}

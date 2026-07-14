import { createClient } from '@/lib/supabase/server'
import { VendorForm } from '@/components/vendors/vendor-form'

export default async function NewVendorPage() {
  const supabase = await createClient()
  const [{ data: services }, { data: cities }] = await Promise.all([
    supabase.from('services').select('id,name').eq('is_active', true).order('name'),
    supabase.from('cities').select('name').eq('is_active', true).order('name'),
  ])

  return (
    <VendorForm
      mode="create"
      services={services ?? []}
      cities={(cities ?? []).map((c) => c.name)}
    />
  )
}

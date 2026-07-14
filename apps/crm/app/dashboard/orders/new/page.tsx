import { createClient } from '@/lib/supabase/server'
import { ManualOrderForm } from '@/components/orders/manual-order-form'

export default async function NewOrderPage() {
  const supabase = await createClient()
  const [{ data: services }, { data: cities }] = await Promise.all([
    supabase.from('services').select('id,name,price,display_price_label').eq('is_active', true).order('name'),
    supabase.from('cities').select('name').eq('is_active', true).order('name'),
  ])

  return (
    <ManualOrderForm
      services={(services ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        label: s.display_price_label ?? '',
      }))}
      cities={(cities ?? []).map((c) => c.name)}
    />
  )
}

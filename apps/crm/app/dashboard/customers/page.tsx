import { createClient } from '@/lib/supabase/server'
import { CustomersTable, type CustomerRow } from '@/components/customers/customers-table'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select('id,name,phone,email,city,created_at,orders(id,total)')
    .order('created_at', { ascending: false })

  const rows: CustomerRow[] = (data ?? []).map((c) => {
    const orders = (c.orders as { id: string; total: number }[] | null) ?? []
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      city: c.city ?? '—',
      created_at: c.created_at,
      orderCount: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Customers</h1>
        <p className="text-muted-foreground">Everyone who has booked, with history & value</p>
      </div>
      <CustomersTable customers={rows} />
    </div>
  )
}

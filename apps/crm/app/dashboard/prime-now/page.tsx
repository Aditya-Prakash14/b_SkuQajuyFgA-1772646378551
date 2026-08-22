import { createClient } from '@/lib/supabase/server'
import {
  PrimeNowRequestsTable,
  type PrimeNowRow,
} from '@/components/prime-now/requests-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

/**
 * The Prime Now dispatch queue. Requests land here from the website the moment
 * the form is submitted — before the customer's WhatsApp message arrives — so
 * nothing depends on a chat thread being seen.
 */
export default async function PrimeNowPage() {
  const supabase = await createClient()

  const [{ data: requests }, { data: vendors }, { data: offerRows }] = await Promise.all([
    supabase
      .from('prime_now_requests')
      .select(
        'id,request_number,name,phone,address,city,slot,slot_minutes,price,tasks,notes,timing,scheduled_for,status,assigned_vendor_id,created_at',
      )
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('vendors').select('id,name,city').eq('status', 'active').order('name'),
    supabase
      .from('job_offers')
      .select('job_id')
      .eq('kind', 'prime_now')
      .eq('status', 'offered')
      .gt('expires_at', 'now()'),
  ])

  const openOffers = new Map<string, number>()
  for (const o of offerRows ?? []) {
    openOffers.set(o.job_id, (openOffers.get(o.job_id) ?? 0) + 1)
  }

  const rows = ((requests ?? []) as unknown[]).map((r) => {
    const row = r as PrimeNowRow
    return { ...row, openOffers: openOffers.get(row.id) ?? 0 }
  })
  const open = rows.filter((r) => r.status === 'new').length
  const asap = rows.filter((r) => r.status === 'new' && r.timing === 'now').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Prime Now</h1>
        <p className="text-muted-foreground">
          On-demand hourly help — dispatch queue
          {open > 0 ? ` · ${open} unassigned${asap > 0 ? `, ${asap} needing someone now` : ''}` : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>Newest first. Assign a partner, then move the request as it progresses.</CardDescription>
        </CardHeader>
        <CardContent>
          <PrimeNowRequestsTable rows={rows} vendors={vendors ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}

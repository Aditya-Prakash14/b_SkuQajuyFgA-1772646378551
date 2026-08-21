// Server-side only: imported solely from 'use server' action files.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@prime/shared'

/**
 * Send a job-assignment push to a partner's phone via Expo's push service.
 *
 * Called from the CRM's assignVendor server action — the only place an
 * assignment happens — so there is no DB trigger or edge function to keep in
 * sync. Best-effort by design: a push failure must never fail the assignment.
 * Expo's API needs no credentials for this call; the token itself is the
 * address. https://docs.expo.dev/push-notifications/sending-notifications/
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export type PushOutcome =
  | { sent: true }
  | { sent: false; reason: 'no-token' | 'no-order' | 'expo-error' | 'network'; detail?: string }

export async function notifyVendorOfAssignment(
  supabase: SupabaseClient<Database>,
  orderId: string,
  vendorId: string,
): Promise<PushOutcome> {
  const [{ data: vendor }, { data: order }] = await Promise.all([
    supabase.from('vendors').select('expo_push_token').eq('id', vendorId).maybeSingle(),
    supabase
      .from('orders')
      .select('order_number,scheduled_date,scheduled_slot,city,total,items:order_items(service_name,qty)')
      .eq('id', orderId)
      .maybeSingle(),
  ])
  if (!order) return { sent: false, reason: 'no-order' }
  const token = vendor?.expo_push_token
  if (!token) return { sent: false, reason: 'no-token' }

  const items = (order.items as { service_name: string; qty: number }[] | null) ?? []
  const what = items.map((i) => (i.qty > 1 ? `${i.service_name} ×${i.qty}` : i.service_name)).join(', ') || 'Service'
  const when = order.scheduled_date
    ? `${formatDay(order.scheduled_date)}${order.scheduled_slot ? ` · ${order.scheduled_slot}` : ''}`
    : 'date to be confirmed'

  const message = {
    to: token,
    title: 'New job assigned',
    body: `${what} — ${when}, ${order.city}`,
    data: { order_id: orderId, order_number: order.order_number },
    sound: 'default',
    channelId: 'jobs', // matches the Android channel the app creates
    priority: 'high',
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(message),
    })
    const body = (await res.json()) as { data?: { status: string; message?: string; details?: { error?: string } } }
    const ticket = body.data
    if (!res.ok || !ticket || ticket.status !== 'ok') {
      const detail = ticket?.details?.error ?? ticket?.message ?? `HTTP ${res.status}`
      // A device that uninstalled the app: drop the dead token so we stop trying.
      if (ticket?.details?.error === 'DeviceNotRegistered') {
        await supabase.from('vendors').update({ expo_push_token: null }).eq('id', vendorId)
      }
      return { sent: false, reason: 'expo-error', detail }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: 'network', detail: err instanceof Error ? err.message : String(err) }
  }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDay(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAYS[dt.getDay()]} ${d} ${MONTHS[m - 1]}`
}

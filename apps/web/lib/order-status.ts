import type { OrderStatus } from '@prime/shared'

/** Customer-facing label + badge styling for each order status. */
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pending confirmation', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700' },
  vendor_assigned: { label: 'Professional assigned', className: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'In progress', className: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
}

/** A customer may reschedule or cancel only while the booking is in these states. */
export const CUSTOMER_EDITABLE: OrderStatus[] = ['pending', 'confirmed']

export function statusMeta(status: string) {
  return ORDER_STATUS_META[status as OrderStatus] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
}

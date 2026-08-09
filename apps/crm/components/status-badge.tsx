import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { OrderStatus, PaymentStatus, VendorStatus, InvoiceStatus } from '@prime/shared'

const ORDER: Record<OrderStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'brand' },
  vendor_assigned: { label: 'Vendor assigned', variant: 'secondary' },
  in_progress: { label: 'In progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

const PAYMENT: Record<PaymentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  unpaid: { label: 'Unpaid', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  refunded: { label: 'Refunded', variant: 'secondary' },
  partial: { label: 'Partial', variant: 'brand' },
}

const VENDOR: Record<VendorStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'brand' },
  active: { label: 'Active', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

export const ORDER_STATUSES = Object.keys(ORDER) as OrderStatus[]
export const PAYMENT_STATUSES = Object.keys(PAYMENT) as PaymentStatus[]

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = ORDER[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const m = PAYMENT[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const m = VENDOR[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

export function orderStatusLabel(status: OrderStatus) {
  return ORDER[status].label
}
export function paymentStatusLabel(status: PaymentStatus) {
  return PAYMENT[status].label
}

const INVOICE: Record<InvoiceStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'brand' },
  paid: { label: 'Paid', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  void: { label: 'Void', variant: 'outline' },
}

export const INVOICE_STATUSES = Object.keys(INVOICE) as InvoiceStatus[]

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const m = INVOICE[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

export function invoiceStatusLabel(status: InvoiceStatus) {
  return INVOICE[status].label
}

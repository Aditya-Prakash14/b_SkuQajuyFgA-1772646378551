'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, MapPin, Phone, Truck, User } from 'lucide-react'
import { toast } from 'sonner'
import { formatINR, gstHalves, type OrderStatus, type PaymentStatus } from '@prime/shared'
import { updateOrderStatus, updatePaymentStatus, assignVendor } from '@/app/dashboard/orders/actions'
import {
  ORDER_STATUSES, PAYMENT_STATUSES, orderStatusLabel, paymentStatusLabel,
  OrderStatusBadge, PaymentStatusBadge,
} from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

/** Sentinel for "no vendor" — Radix Select cannot use "" as an item value. */
const UNASSIGNED = '__unassigned__'

interface DetailOrder {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  city: string
  address: string
  scheduled_date: string | null
  created_at: string
  source: string
  subtotal: number
  discount: number
  tax: number
  total: number
  notes: string | null
  assigned_vendor_id: string | null
  customer: { name: string; phone: string; email: string | null; city: string | null } | null
  vendor: { id: string; name: string; phone: string } | null
}

interface Item {
  id: string
  service_name: string
  unit_price: number
  qty: number
  line_total: number
}

export function OrderDetail({
  order,
  items,
  eligibleVendors,
}: {
  order: DetailOrder
  items: Item[]
  eligibleVendors: { id: string; name: string; phone: string }[]
}) {
  const [status, setStatus] = useState(order.status)
  const [payment, setPayment] = useState(order.payment_status)
  const [vendorId, setVendorId] = useState(order.assigned_vendor_id ?? '')
  const [pending, start] = useTransition()

  function changeStatus(v: OrderStatus) {
    setStatus(v)
    start(async () => {
      const r = await updateOrderStatus(order.id, v)
      if ('error' in r) toast.error(r.error)
      else toast.success('Status updated')
    })
  }
  function changePayment(v: PaymentStatus) {
    setPayment(v)
    start(async () => {
      const r = await updatePaymentStatus(order.id, v)
      if ('error' in r) toast.error(r.error)
      else toast.success('Payment updated')
    })
  }
  function changeVendor(v: string) {
    setVendorId(v)
    start(async () => {
      const r = await assignVendor(order.id, v)
      if ('error' in r) toast.error(r.error)
      else toast.success(v ? 'Vendor assigned' : 'Vendor unassigned')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black">{order.order_number}</h1>
            <p className="text-muted-foreground">
              {order.source} · {new Date(order.created_at).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={status} />
          <PaymentStatusBadge status={payment} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Info icon={User} label="Name" value={order.customer?.name ?? '—'} />
              <Info icon={Phone} label="Phone" value={order.customer?.phone ?? '—'} />
              <Info icon={Mail} label="Email" value={order.customer?.email ?? '—'} />
              <Info icon={MapPin} label="City" value={order.city} />
              <div className="sm:col-span-2">
                <Info icon={MapPin} label="Address" value={order.address} />
              </div>
              {order.scheduled_date && (
                <Info label="Scheduled" value={new Date(order.scheduled_date).toLocaleDateString('en-IN')} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <THead>
                  <TR>
                    <TH>Service</TH>
                    <TH>Unit</TH>
                    <TH>Qty</TH>
                    <TH className="text-right">Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((it) => (
                    <TR key={it.id}>
                      <TD className="font-medium">{it.service_name}</TD>
                      <TD>{formatINR(it.unit_price)}</TD>
                      <TD>{it.qty}</TD>
                      <TD className="text-right font-medium">{formatINR(it.line_total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                {order.tax > 0 ? (
                  <>
                    <Row label="Taxable value" value={formatINR(order.subtotal)} />
                    {order.discount > 0 && <Row label="Discount" value={`− ${formatINR(order.discount)}`} />}
                    <Row label="CGST @ 9%" value={formatINR(gstHalves(order.tax).cgst)} />
                    <Row label="SGST @ 9%" value={formatINR(gstHalves(order.tax).sgst)} />
                  </>
                ) : (
                  <>
                    <Row label="Subtotal" value={formatINR(order.subtotal)} />
                    {order.discount > 0 && <Row label="Discount" value={`− ${formatINR(order.discount)}`} />}
                  </>
                )}
                <div className="flex justify-between pt-1 text-base font-bold">
                  <span>Total</span>
                  <span>{formatINR(order.total)}</span>
                </div>
                {order.tax > 0 && (
                  <p className="text-right text-[11px] text-muted-foreground">Incl. GST</p>
                )}
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{order.notes}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Manage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Order status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => changeStatus(v as OrderStatus)}
                  disabled={pending}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{orderStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Payment status</Label>
                <Select
                  value={payment}
                  onValueChange={(v) => changePayment(v as PaymentStatus)}
                  disabled={pending}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{paymentStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4" /> Vendor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.vendor && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{order.vendor.name}</p>
                  <p className="text-muted-foreground">{order.vendor.phone}</p>
                </div>
              )}
              <div>
                <Label className="mb-1.5 block">Assign vendor</Label>
                {/* Radix Select treats "" as "no value", so unassigning needs a
                    sentinel item that is mapped back to "" for the action. */}
                <Select
                  value={vendorId || UNASSIGNED}
                  onValueChange={(v) => changeVendor(v === UNASSIGNED ? '' : v)}
                  disabled={pending}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>— Unassigned —</SelectItem>
                    {eligibleVendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name} · {v.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {eligibleVendors.length === 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    No active vendors serving these services in {order.city}. Add vendors under Vendors (Phase 7).
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Info({
  icon: Icon, label, value,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

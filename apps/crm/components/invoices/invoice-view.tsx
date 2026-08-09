'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { formatINR, gstHalves, type InvoiceStatus } from '@prime/shared'
import { updateInvoiceStatus, markInvoicePaid } from '@/app/dashboard/invoices/actions'
import { InvoiceStatusBadge, INVOICE_STATUSES, invoiceStatusLabel } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

interface InvoiceData {
  id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string | null
  due_date: string | null
  subtotal: number
  discount: number
  tax: number
  total: number
  payment_method: string | null
  paid_at: string | null
  orderNumber: string | null
  address: string
  scheduledDate: string | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
  items: { service_name: string; unit_price: number; qty: number; line_total: number }[]
}

const METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer']

export function InvoiceView({ invoice }: { invoice: InvoiceData }) {
  const [status, setStatus] = useState(invoice.status)
  const [method, setMethod] = useState('UPI')
  const [, start] = useTransition()

  function changeStatus(v: InvoiceStatus) {
    setStatus(v)
    start(async () => {
      const r = await updateInvoiceStatus(invoice.id, v)
      if ('error' in r) toast.error(r.error)
      else toast.success('Invoice updated')
    })
  }

  function markPaid() {
    setStatus('paid')
    start(async () => {
      const r = await markInvoicePaid(invoice.id, method)
      if ('error' in r) toast.error(r.error)
      else toast.success('Marked paid — order payment updated too')
    })
  }

  return (
    <div className="space-y-6">
      {/* Controls (hidden when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-black">{invoice.invoice_number}</h1>
          <InvoiceStatusBadge status={status} />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="mb-1 block text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => changeStatus(v as InvoiceStatus)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{invoiceStatusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status !== 'paid' && (
            <>
              <div>
                <Label className="mb-1 block text-xs">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-36 capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="brand" onClick={markPaid}>Mark as paid</Button>
            </>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Invoice document */}
      <Card className="mx-auto max-w-3xl print:border-0 print:shadow-none">
        <CardContent className="p-8">
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-black text-primary-foreground">M</div>
                <div>
                  <p className="font-black">MyPrimeCompany</p>
                  <p className="text-xs text-muted-foreground">Professional cleaning &amp; pest control</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black tracking-tight">TAX INVOICE</p>
              <p className="text-sm text-muted-foreground">{invoice.invoice_number}</p>
            </div>
          </div>

          <div className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill to</p>
              <p className="font-semibold">{invoice.customerName}</p>
              <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
              {invoice.customerEmail && <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>}
              {invoice.address && <p className="mt-1 text-sm text-muted-foreground">{invoice.address}</p>}
            </div>
            <div className="sm:text-right">
              <Meta label="Issue date" value={invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-IN') : '—'} />
              <Meta label="Due date" value={invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '—'} />
              {invoice.orderNumber && <Meta label="Order" value={invoice.orderNumber} />}
              {invoice.paid_at && <Meta label="Paid on" value={new Date(invoice.paid_at).toLocaleDateString('en-IN')} />}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-y text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Service</th>
                <th className="py-2 text-right">Unit</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2.5">{it.service_name}</td>
                  <td className="py-2.5 text-right">{formatINR(it.unit_price)}</td>
                  <td className="py-2.5 text-right">{it.qty}</td>
                  <td className="py-2.5 text-right font-medium">{formatINR(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
            {invoice.tax > 0 ? (
              <>
                <Row label="Taxable value" value={formatINR(invoice.subtotal)} />
                {invoice.discount > 0 && <Row label="Discount" value={`− ${formatINR(invoice.discount)}`} />}
                <Row label="CGST @ 9%" value={formatINR(gstHalves(invoice.tax).cgst)} />
                <Row label="SGST @ 9%" value={formatINR(gstHalves(invoice.tax).sgst)} />
              </>
            ) : (
              <>
                <Row label="Subtotal" value={formatINR(invoice.subtotal)} />
                {invoice.discount > 0 && <Row label="Discount" value={`− ${formatINR(invoice.discount)}`} />}
              </>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-black">
              <span>Total</span>
              <span>{formatINR(invoice.total)}</span>
            </div>
            {invoice.tax > 0 && (
              <p className="pt-1 text-right text-[11px] text-muted-foreground">Prices are inclusive of GST.</p>
            )}
          </div>

          {status === 'paid' && (
            <div className="mt-6 inline-block rounded-lg border-2 border-green-500 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-green-600">
              Paid{invoice.payment_method ? ` · ${invoice.payment_method}` : ''}
            </div>
          )}

          <p className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
            MyPrimeCompany · +91 73496 03429 · support@myprimecompany.in — Thank you for your business!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </p>
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

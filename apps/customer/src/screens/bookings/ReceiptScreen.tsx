import { useEffect, useState } from 'react'
import { Linking, Share, View } from 'react-native'

import { Body, Button, Card, Divider, Eyebrow, H1, Muted, Screen, Text } from '../../components/ui'
import { fetchInvoice, invoiceLink } from '../../lib/bookings'
import { formatDay, formatINR, formatINRPaise, formatStamp } from '../../lib/format'
import { TASK_LABEL } from '../../lib/prime-now'
import { errorMessage } from '../../lib/supabase'
import type { Invoice } from '../../lib/types'
import type { BookingsStackProps } from '../../navigation/types'

const COMPANY = {
  name: 'MyPrimeCompany',
  address: 'HSR Layout Sector 4, 17th Main B Cross, Bangalore, Karnataka 560102',
  email: 'support@myprimecompany.in',
  phone: '+91 73496 03429',
}

/**
 * The receipt for a booking, built from the booking itself so it exists the
 * moment the job is paid — and the CRM's GST invoice on top when ops has
 * issued one. Prices are GST-inclusive; the split mirrors the invoice.
 */
export function ReceiptScreen({ route }: BookingsStackProps<'Receipt'>) {
  const { booking } = route.params
  const isNow = booking.kind === 'now'
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNow) return
    fetchInvoice(booking.id)
      .then(setInvoice)
      .catch(() => {})
  }, [booking.id, isNow])

  const cgst = Math.round((booking.tax / 2) * 100) / 100
  const sgst = Math.round((booking.tax - cgst) * 100) / 100
  const paid = booking.paymentStatus === 'paid'

  async function openInvoice() {
    if (!invoice) return
    setOpening(true)
    setError(null)
    try {
      const url = await invoiceLink(invoice)
      if (!url) {
        setError('The PDF for this invoice has not been uploaded yet. Call us and we will send it.')
        return
      }
      await Linking.openURL(url)
    } catch (err) {
      setError(errorMessage(err, 'Could not open the invoice.'))
    } finally {
      setOpening(false)
    }
  }

  function share() {
    const lines = [
      `${COMPANY.name} — receipt ${booking.reference}`,
      `${formatDay(booking.scheduledDate)}${booking.scheduledSlot ? ` · ${booking.scheduledSlot}` : ''}`,
      '',
      ...booking.items.map(
        (i) =>
          `${i.service_name}${i.units > 1 ? ` · ${i.units}` : ''}${i.qty > 1 ? ` ×${i.qty}` : ''}: ${formatINR(i.line_total)}`,
      ),
      '',
      ...(!isNow && booking.tax > 0
        ? [
            `Taxable value: ${formatINRPaise(booking.subtotal)}`,
            `CGST @ 9%: ${formatINRPaise(cgst)}`,
            `SGST @ 9%: ${formatINRPaise(sgst)}`,
          ]
        : []),
      `Total: ${formatINR(booking.total)}${isNow ? ' (flat slot price)' : ' (inclusive of 18% GST)'}`,
      paid
        ? `Paid${booking.paymentMethod ? ` by ${booking.paymentMethod}` : ''}${booking.paidAt ? ` on ${formatStamp(booking.paidAt)}` : ''}`
        : 'Payment due after the work is done',
      invoice ? `GST invoice ${invoice.invoice_number}` : '',
      '',
      `${COMPANY.address} · ${COMPANY.email} · ${COMPANY.phone}`,
    ].filter((l) => l !== '')
    Share.share({ message: lines.join('\n') }).catch(() => {})
  }

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <Eyebrow className="text-primary">{booking.reference}</Eyebrow>
          <H1>Receipt</H1>
          <Muted>
            {formatDay(booking.scheduledDate)}
            {booking.scheduledSlot ? ` · ${booking.scheduledSlot}` : ''}
          </Muted>
        </View>

        {error ? <Muted className="text-destructive">{error}</Muted> : null}

        <Card className="gap-1">
          <Text className="font-bold text-[15px] text-foreground">{COMPANY.name}</Text>
          <Muted className="text-[12px]">{COMPANY.address}</Muted>
          <Muted className="text-[12px]">
            {COMPANY.email} · {COMPANY.phone}
          </Muted>
        </Card>

        <Card className="gap-2.5">
          <Eyebrow>Services</Eyebrow>
          {booking.items.map((i, n) => (
            <View key={n} className="flex-row items-baseline justify-between gap-3">
              <Muted className="flex-1">
                {i.service_name}
                {i.units > 1 ? ` · ${i.units}` : ''}
                {i.qty > 1 ? ` ×${i.qty}` : ''}
              </Muted>
              <Text className="font-medium text-[14px] text-foreground">{formatINR(i.line_total)}</Text>
            </View>
          ))}
          {isNow && booking.tasks && booking.tasks.length > 0 ? (
            <Muted className="text-[12px]">{booking.tasks.map((t) => TASK_LABEL[t] ?? t).join(' · ')}</Muted>
          ) : null}
          <Divider className="my-1" />
          {!isNow && booking.tax > 0 ? (
            <>
              <Row label="Taxable value" value={formatINRPaise(booking.subtotal)} />
              <Row label="CGST @ 9%" value={formatINRPaise(cgst)} />
              <Row label="SGST @ 9%" value={formatINRPaise(sgst)} />
            </>
          ) : null}
          <View className="flex-row items-baseline justify-between">
            <Text className="font-bold text-[15px] text-foreground">Total</Text>
            <Text className="font-black text-[20px] text-foreground">{formatINR(booking.total)}</Text>
          </View>
          <Muted className="text-[11px]">{isNow ? 'Flat price for the slot. No travel charge.' : 'Inclusive of 18% GST.'}</Muted>
        </Card>

        <Card className="gap-1">
          <Eyebrow>Payment</Eyebrow>
          <Text className="font-bold text-[14px] text-foreground">
            {paid ? 'Paid' : 'Due after the work is done'}
          </Text>
          {paid ? (
            <Muted className="text-[12px]">
              {booking.paymentMethod ? `By ${booking.paymentMethod}` : 'Recorded by our team'}
              {booking.paidAt ? ` · ${formatStamp(booking.paidAt)}` : ''}
            </Muted>
          ) : (
            <Muted className="text-[12px]">Cash or UPI to the helper when the job is finished.</Muted>
          )}
          <Muted className="text-[12px]">
            {booking.address}
            {booking.city ? `, ${booking.city}` : ''}
          </Muted>
        </Card>

        {invoice ? (
          <Card className="gap-2">
            <Eyebrow>GST invoice</Eyebrow>
            <Text className="font-mono text-[15px] text-foreground">{invoice.invoice_number}</Text>
            <Muted className="text-[12px]">
              {invoice.issue_date ? `Issued ${formatDay(invoice.issue_date.slice(0, 10))}` : 'Issued'} · {invoice.status}
            </Muted>
            <Button label="Open invoice PDF" variant="outline" onPress={openInvoice} loading={opening} />
          </Card>
        ) : !isNow ? (
          <Muted className="text-[12px]">
            A GST invoice with our GSTIN is issued by our team on request — call or email us with the booking reference.
          </Muted>
        ) : null}

        <Button label="Share receipt" onPress={share} />
      </Body>
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Muted className="text-[13px]">{label}</Muted>
      <Text className="font-medium text-[13px] text-foreground">{value}</Text>
    </View>
  )
}

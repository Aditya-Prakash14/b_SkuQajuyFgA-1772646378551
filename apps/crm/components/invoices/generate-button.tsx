'use client'

import { useTransition } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createInvoiceFromOrder } from '@/app/dashboard/invoices/actions'
import { Button } from '@/components/ui/button'

export function GenerateInvoiceButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await createInvoiceFromOrder(orderId)
          if (r && 'error' in r) toast.error(r.error)
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Generate
    </Button>
  )
}

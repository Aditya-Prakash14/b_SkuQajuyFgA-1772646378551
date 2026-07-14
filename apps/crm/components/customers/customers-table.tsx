'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { formatINR } from '@prime/shared'
import { Input } from '@/components/ui/input'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

export interface CustomerRow {
  id: string
  name: string
  phone: string
  email: string | null
  city: string
  created_at: string | null
  orderCount: number
  totalSpent: number
}

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? '').toLowerCase().includes(q),
    )
  }, [customers, query])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <THead>
            <TR>
              <TH>Customer</TH>
              <TH>City</TH>
              <TH>Orders</TH>
              <TH>Lifetime value</TH>
              <TH>Joined</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((c) => (
              <TR key={c.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/customers/${c.id}`)}>
                <TD>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.phone}
                    {c.email ? ` · ${c.email}` : ''}
                  </p>
                </TD>
                <TD>{c.city}</TD>
                <TD className="tabular-nums">{c.orderCount}</TD>
                <TD className="whitespace-nowrap font-medium tabular-nums">{formatINR(c.totalSpent)}</TD>
                <TD className="whitespace-nowrap text-muted-foreground">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}
                </TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR>
                <TD className="py-10 text-center text-muted-foreground" colSpan={5}>
                  No customers found.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} customers</p>
    </div>
  )
}

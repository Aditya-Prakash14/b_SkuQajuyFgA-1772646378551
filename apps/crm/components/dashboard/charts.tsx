'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatINRShort } from '@prime/shared'

const axisTick = { fontSize: 11, fill: 'var(--muted-foreground)' }
const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--card-foreground)',
  fontSize: 12,
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grid h-60 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  )
}

// Single measure (revenue) across categories → one hue, magnitude comparison.
export function RevenueByCategoryChart({ data }: { data: { category: string; revenue: number }[] }) {
  if (!data.length) return <Empty label="No revenue yet" />
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="category" tick={axisTick} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={64} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => formatINRShort(Number(v))} />
        <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={tooltipStyle} formatter={(v: number) => [formatINRShort(v), 'Revenue']} />
        <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BookingsByCityChart({ data }: { data: { city: string; count: number }[] }) {
  if (!data.length) return <Empty label="No bookings yet" />
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="city" tick={axisTick} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={64} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Bookings']} />
        <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

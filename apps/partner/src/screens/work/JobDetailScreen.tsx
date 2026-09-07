import { useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native'

import { Badge, Banner, Button, Card, Text } from '../../components/ui'
import { formatDay, formatINR, markEnRoute, updateJobStatus } from '../../lib/jobs'
import { errorMessage } from '../../lib/supabase'
import { JOB_STATUS_LABELS, type Job } from '../../lib/types'

/**
 * One job: who, where, what, and the single next action for its status.
 *   vendor_assigned → "Start job"        → in_progress
 *   in_progress     → "Mark completed"   → completed  (+ optional cash collected)
 * Transitions are enforced again in update_my_job_status(); the UI just never
 * offers a button the server would refuse.
 */
export function JobDetailScreen({
  job,
  onBack,
  onChanged,
}: {
  job: Job
  onBack: () => void
  onChanged: () => Promise<void> | void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cashCollected, setCashCollected] = useState(false)

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [job.address, job.city].filter(Boolean).join(', '),
  )}`

  async function move(status: 'in_progress' | 'completed') {
    setBusy(true)
    setError(null)
    try {
      await updateJobStatus(job.id, status, status === 'completed' && cashCollected)
      await onChanged()
    } catch (err) {
      setError(errorMessage(err, 'Could not update the job. Check your connection and try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function enRoute() {
    setBusy(true)
    setError(null)
    try {
      await markEnRoute(job.id)
      await onChanged()
    } catch (err) {
      setError(errorMessage(err, 'Could not update the job. Check your connection and try again.'))
    } finally {
      setBusy(false)
    }
  }

  function confirmComplete() {
    Alert.alert(
      'Mark as completed?',
      cashCollected
        ? `This records ${formatINR(job.total)} collected in cash from ${job.customer_name}.`
        : 'The customer will be asked to rate the service.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Complete job', style: 'default', onPress: () => move('completed') },
      ],
    )
  }

  const statusTone =
    job.status === 'in_progress'
      ? 'brand'
      : job.status === 'completed'
        ? 'success'
        : job.status === 'cancelled'
          ? 'destructive'
          : 'default'
  const payTone = job.payment_status === 'paid' ? 'success' : job.payment_status === 'unpaid' ? 'warning' : 'secondary'

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 14 }}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" className="self-start py-1">
        <Text className="text-sm font-semibold text-primary">‹ All jobs</Text>
      </Pressable>

      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{job.order_number}</Text>
          <Text className="mt-1 text-xl font-bold leading-7 text-foreground">
            {formatDay(job.scheduled_date)}
            {job.scheduled_slot ? ` · ${job.scheduled_slot}` : ''}
          </Text>
        </View>
        <Badge variant={statusTone}>
          <Text>{JOB_STATUS_LABELS[job.status]}</Text>
        </Badge>
      </View>

      {error ? <Banner tone="error">{error}</Banner> : null}
      {job.status === 'completed' ? <Banner tone="success">Job completed. Nice work.</Banner> : null}
      {job.status === 'cancelled' ? <Banner tone="warn">This booking was cancelled. No action needed.</Banner> : null}

      <Card>
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Customer</Text>
        <View className="mt-2 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">{job.customer_name}</Text>
            <Text className="text-sm text-muted-foreground">{job.customer_phone}</Text>
          </View>
          <Button label="Call" variant="ghost" onPress={() => Linking.openURL(`tel:${job.customer_phone}`)} />
        </View>
      </Card>

      <Card>
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Location</Text>
        <Text className="mt-2 text-sm leading-5 text-foreground">
          {job.address ?? 'Address not provided'}
          {job.city ? `\n${job.city}` : ''}
        </Text>
        {job.address || job.city ? (
          <View className="mt-3">
            <Button label="Open in Maps" variant="ghost" onPress={() => Linking.openURL(mapsUrl)} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Work</Text>
        <View className="mt-2 gap-2">
          {job.items.map((i, idx) => (
            <View key={idx} className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-sm text-foreground">
                {i.service_name}
                {i.qty > 1 ? `  ×${i.qty}` : ''}
              </Text>
              <Text className="text-sm font-medium text-foreground">{formatINR(i.line_total)}</Text>
            </View>
          ))}
        </View>
        <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-foreground">Total</Text>
            <Badge variant={payTone}>
              <Text>
                {job.payment_status}
                {job.payment_method ? ` · ${job.payment_method}` : ''}
              </Text>
            </Badge>
          </View>
          <Text className="text-lg font-bold text-foreground">{formatINR(job.total)}</Text>
        </View>
        {job.notes ? (
          <View className="mt-3 rounded-lg bg-muted p-3">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Customer notes</Text>
            <Text className="mt-1 text-sm leading-5 text-foreground">{job.notes}</Text>
          </View>
        ) : null}
      </Card>

      {job.status === 'vendor_assigned' ? (
        <View className="gap-3">
          {job.en_route_at ? (
            <Text className="text-center text-xs text-muted-foreground">
              You told the customer you are on the way.
            </Text>
          ) : (
            <Button label="On my way" variant="ghost" onPress={enRoute} loading={busy} />
          )}
          <Button label="Start job" variant="brand" onPress={() => move('in_progress')} loading={busy} />
        </View>
      ) : null}

      {job.status === 'in_progress' ? (
        <View className="gap-3">
          {job.payment_status === 'unpaid' ? (
            <Pressable
              onPress={() => setCashCollected((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: cashCollected }}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:opacity-80"
            >
              <View
                className={
                  cashCollected
                    ? 'h-6 w-6 items-center justify-center rounded-md border-2 border-primary bg-primary'
                    : 'h-6 w-6 items-center justify-center rounded-md border-2 border-input bg-background'
                }
              >
                {cashCollected ? <Text className="text-sm font-bold text-primary-foreground">✓</Text> : null}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Cash collected from customer</Text>
                <Text className="text-xs text-muted-foreground">Marks {formatINR(job.total)} as paid in cash</Text>
              </View>
            </Pressable>
          ) : null}
          <Button label="Mark completed" variant="brand" onPress={confirmComplete} loading={busy} />
        </View>
      ) : null}
    </ScrollView>
  )
}

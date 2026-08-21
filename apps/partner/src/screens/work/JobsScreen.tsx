import { Pressable, RefreshControl, ScrollView, View } from 'react-native'

import { Badge, Banner, Button, Card, Text } from '../../components/ui'
import { dayBucket, formatDay, formatINR, isOpen } from '../../lib/jobs'
import { JOB_STATUS_LABELS, type Job } from '../../lib/types'

/**
 * Open work, bucketed by urgency: Overdue → Today → Upcoming → Unscheduled.
 * Jobs arrive here only after ops assigns them in the CRM.
 */
export function JobsScreen({
  jobs,
  refreshing,
  error,
  onRefresh,
  onOpen,
}: {
  jobs: Job[]
  refreshing: boolean
  error: string | null
  onRefresh: () => void
  onOpen: (job: Job) => void
}) {
  const open = jobs.filter(isOpen)
  const groups: { key: ReturnType<typeof dayBucket>; title: string; tone: 'destructive' | 'brand' | 'default' | 'secondary' }[] = [
    { key: 'overdue', title: 'Overdue', tone: 'destructive' },
    { key: 'today', title: 'Today', tone: 'brand' },
    { key: 'upcoming', title: 'Upcoming', tone: 'default' },
    { key: 'unscheduled', title: 'Date to be confirmed', tone: 'secondary' },
  ]

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View>
        <Text className="text-2xl font-bold text-foreground">Your jobs</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          {open.length === 0 ? 'Nothing assigned right now.' : `${open.length} open job${open.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      {error ? <Banner tone="error">{error}</Banner> : null}

      {open.length === 0 && !error ? (
        <Card>
          <Text className="text-base font-semibold text-foreground">You're all caught up</Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            New jobs in your city and services appear here as soon as our ops team assigns them.
            Pull down to refresh.
          </Text>
          <View className="mt-3">
            <Button label="Refresh" variant="ghost" onPress={onRefresh} />
          </View>
        </Card>
      ) : null}

      {groups.map((g) => {
        const list = open
          .filter((j) => dayBucket(j.scheduled_date) === g.key)
          .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))
        if (list.length === 0) return null
        return (
          <View key={g.key} className="gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.title}</Text>
              <Badge variant={g.tone}>
                <Text>{list.length}</Text>
              </Badge>
            </View>
            {list.map((job) => (
              <JobCard key={job.id} job={job} onPress={() => onOpen(job)} />
            ))}
          </View>
        )
      })}
    </ScrollView>
  )
}

export function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const services = job.items.map((i) => (i.qty > 1 ? `${i.service_name} ×${i.qty}` : i.service_name)).join(', ')
  const statusTone =
    job.status === 'in_progress' ? 'brand' : job.status === 'completed' ? 'success' : job.status === 'cancelled' ? 'destructive' : 'default'

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-80">
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[15px] font-semibold leading-5 text-foreground" numberOfLines={2}>
              {services || 'Service'}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">{job.order_number}</Text>
          </View>
          <Badge variant={statusTone}>
            <Text>{JOB_STATUS_LABELS[job.status]}</Text>
          </Badge>
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {formatDay(job.scheduled_date)}
              {job.scheduled_slot ? ` · ${job.scheduled_slot}` : ''}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
              {job.customer_name}
              {job.address ? ` · ${job.address}` : job.city ? ` · ${job.city}` : ''}
            </Text>
          </View>
          <Text className="text-base font-bold text-foreground">{formatINR(job.total)}</Text>
        </View>
      </Card>
    </Pressable>
  )
}

import { Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native'

import { Badge, Banner, Button, Card, Text } from '../../components/ui'
import { dayBucket, formatDay, formatINR, isOpen } from '../../lib/jobs'
import { JOB_STATUS_LABELS, type Job, type Offer } from '../../lib/types'
import { OffersBanner } from './OffersBanner'

/**
 * Open work, bucketed by urgency: Overdue → Today → Upcoming → Unscheduled.
 * Above it: offers waiting on an answer, and the go-online switch that decides
 * whether Prime Now work is offered to this partner at all.
 */
export function JobsScreen({
  jobs,
  offers,
  wantsPrimeNow,
  online,
  onlineBusy,
  refreshing,
  error,
  onToggleOnline,
  onRefresh,
  onOpen,
  onOffersChanged,
}: {
  jobs: Job[]
  offers: Offer[]
  /** False when the partner has not opted into Prime Now at all. */
  wantsPrimeNow: boolean
  online: boolean
  onlineBusy: boolean
  refreshing: boolean
  error: string | null
  onToggleOnline: (next: boolean) => void
  onRefresh: () => void
  onOpen: (job: Job) => void
  onOffersChanged: () => Promise<void> | void
}) {
  const open = jobs.filter(isOpen)
  const groups: {
    key: ReturnType<typeof dayBucket>
    title: string
    tone: 'destructive' | 'brand' | 'default' | 'secondary'
  }[] = [
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

      {/* Availability gate — no online, no instant work. Pointless if the
          partner has not opted into Prime Now, so it is hidden then. */}
      {wantsPrimeNow ? (
        <Card>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {online ? "You're online" : "You're offline"}
              </Text>
              <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
                {online
                  ? 'Prime Now jobs near you will be offered to you as they come in.'
                  : 'Go online to receive Prime Now jobs. Scheduled work is unaffected.'}
              </Text>
            </View>
            <Switch value={online} onValueChange={onToggleOnline} disabled={onlineBusy} />
          </View>
        </Card>
      ) : null}

      <OffersBanner offers={offers} onResponded={onOffersChanged} />

      {error ? <Banner tone="error">{error}</Banner> : null}

      {open.length === 0 && !error ? (
        <Card>
          <Text className="text-base font-semibold text-foreground">You&apos;re all caught up</Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            New jobs appear here as soon as you accept an offer or our ops team assigns you one.
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
  const services = job.items
    .map((i) => {
      if (i.units && i.units > 1) return `${i.service_name} · ${i.units}`
      return i.qty > 1 ? `${i.service_name} ×${i.qty}` : i.service_name
    })
    .join(', ')
  const statusTone =
    job.status === 'in_progress'
      ? 'brand'
      : job.status === 'completed'
        ? 'success'
        : job.status === 'cancelled'
          ? 'destructive'
          : 'default'

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-80">
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              {job.kind === 'prime_now' ? (
                <Badge variant="brand">
                  <Text>Prime Now</Text>
                </Badge>
              ) : null}
              <Text className="text-xs text-muted-foreground">{job.order_number}</Text>
            </View>
            <Text className="mt-1 text-[15px] font-semibold leading-5 text-foreground" numberOfLines={2}>
              {services || 'Service'}
            </Text>
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

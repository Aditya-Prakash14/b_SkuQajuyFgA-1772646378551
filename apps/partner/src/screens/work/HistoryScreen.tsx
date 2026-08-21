import { RefreshControl, ScrollView, View } from 'react-native'

import { Banner, Card, Text } from '../../components/ui'
import { currentMonthName, formatINR, isOpen } from '../../lib/jobs'
import type { Job, VendorStats } from '../../lib/types'
import { JobCard } from './JobsScreen'

/**
 * Finished work plus the numbers a partner actually checks: what they are owed
 * this month, how many jobs, and the commission that explains the gap between
 * what the customer paid and the payout. All figures come from my_stats() so
 * the commission rule lives in exactly one place (the database).
 */
export function HistoryScreen({
  jobs,
  stats,
  refreshing,
  error,
  onRefresh,
  onOpen,
}: {
  jobs: Job[]
  stats: VendorStats | null
  refreshing: boolean
  error: string | null
  onRefresh: () => void
  onOpen: (job: Job) => void
}) {
  const done = jobs.filter((j) => !isOpen(j)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text className="text-2xl font-bold text-foreground">History</Text>

      <Card>
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Your payout · {currentMonthName()}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">{formatINR(stats?.month_payout ?? 0)}</Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">
          {stats && stats.month_jobs > 0
            ? `${stats.month_jobs} job${stats.month_jobs === 1 ? '' : 's'} completed · customers paid ${formatINR(stats.month_gross)}`
            : 'No completed jobs yet this month'}
        </Text>
        {stats ? (
          <Text className="mt-3 text-xs leading-4 text-muted-foreground">
            Payout is the service value minus the {stats.commission_rate}% platform commission. GST collected from the
            customer is not part of your payout.
          </Text>
        ) : null}
      </Card>

      <View className="flex-row gap-3">
        <Card className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Completed</Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">{stats?.completed_count ?? 0}</Text>
          <Text className="text-xs text-muted-foreground">all time</Text>
        </Card>
        <Card className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Earned</Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">{formatINR(stats?.all_time_payout ?? 0)}</Text>
          <Text className="text-xs text-muted-foreground">all time</Text>
        </Card>
      </View>

      {error ? <Banner tone="error">{error}</Banner> : null}

      {done.length === 0 ? (
        <Card>
          <Text className="text-base font-semibold text-foreground">No finished jobs yet</Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Jobs you complete (or that get cancelled) will be listed here.
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          {done.map((job) => (
            <JobCard key={job.id} job={job} onPress={() => onOpen(job)} />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

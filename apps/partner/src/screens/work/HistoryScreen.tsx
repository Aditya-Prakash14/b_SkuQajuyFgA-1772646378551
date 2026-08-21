import { RefreshControl, ScrollView, View } from 'react-native'

import { Banner, Card, Text } from '../../components/ui'
import { formatINR, isOpen, isThisMonth } from '../../lib/jobs'
import type { Job } from '../../lib/types'
import { JobCard } from './JobsScreen'

/** Finished work plus the two numbers a partner actually checks: count and this month's value. */
export function HistoryScreen({
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
  const done = jobs.filter((j) => !isOpen(j)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const completed = done.filter((j) => j.status === 'completed')
  const monthValue = completed.filter((j) => isThisMonth(j.updated_at)).reduce((s, j) => s + j.total, 0)

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text className="text-2xl font-bold text-foreground">History</Text>

      <View className="flex-row gap-3">
        <Card className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Completed</Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">{completed.length}</Text>
          <Text className="text-xs text-muted-foreground">all time</Text>
        </Card>
        <Card className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">This month</Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">{formatINR(monthValue)}</Text>
          <Text className="text-xs text-muted-foreground">job value</Text>
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
        <View className="gap-2">{done.map((job) => <JobCard key={job.id} job={job} onPress={() => onOpen(job)} />)}</View>
      )}
    </ScrollView>
  )
}

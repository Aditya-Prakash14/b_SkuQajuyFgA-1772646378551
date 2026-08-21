import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Pressable, View } from 'react-native'

import { Loading, Text } from '../../components/ui'
import { fetchMyJobs, isOpen } from '../../lib/jobs'
import { errorMessage, supabase } from '../../lib/supabase'
import type { Job, Vendor } from '../../lib/types'
import { ProfileScreen } from '../ProfileScreen'
import { AccountScreen } from './AccountScreen'
import { HistoryScreen } from './HistoryScreen'
import { JobDetailScreen } from './JobDetailScreen'
import { JobsScreen } from './JobsScreen'

type Tab = 'jobs' | 'history' | 'account'

/**
 * The working app, once a partner is approved/active. Same no-router stance as
 * onboarding: a tab + an optional selected job, held in state. Data is one
 * list (my_jobs) shared by every tab, refreshed on pull, on foreground, and
 * after every status change — Realtime is not enabled on this project.
 */
export function WorkspaceShell({ vendor, onVendorChanged }: { vendor: Vendor; onVendorChanged: () => void }) {
  const [tab, setTab] = useState<Tab>('jobs')
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inflight = useRef(false)

  const load = useCallback(async () => {
    if (inflight.current) return
    inflight.current = true
    setRefreshing(true)
    try {
      setJobs(await fetchMyJobs())
      setError(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not load your jobs.'))
      setJobs((prev) => prev ?? [])
    } finally {
      setRefreshing(false)
      inflight.current = false
    }
  }, [])

  useEffect(() => {
    load()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') load()
    })
    return () => sub.remove()
  }, [load])

  if (jobs === null) return <Loading label="Loading your jobs…" />

  const selected = selectedId ? (jobs.find((j) => j.id === selectedId) ?? null) : null
  const openCount = jobs.filter(isOpen).length

  if (selected) {
    return (
      <JobDetailScreen
        job={selected}
        onBack={() => setSelectedId(null)}
        onChanged={async () => {
          await load()
        }}
      />
    )
  }

  if (editing) {
    return (
      <ProfileScreen
        vendor={vendor}
        mode="edit"
        onSaved={() => {
          setEditing(false)
          onVendorChanged()
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <View className="flex-1">
      <View className="flex-1">
        {tab === 'jobs' ? (
          <JobsScreen
            jobs={jobs}
            refreshing={refreshing}
            error={error}
            onRefresh={load}
            onOpen={(j) => setSelectedId(j.id)}
          />
        ) : tab === 'history' ? (
          <HistoryScreen
            jobs={jobs}
            refreshing={refreshing}
            error={error}
            onRefresh={load}
            onOpen={(j) => setSelectedId(j.id)}
          />
        ) : (
          <AccountScreen vendor={vendor} onEdit={() => setEditing(true)} onSignOut={() => supabase.auth.signOut()} />
        )}
      </View>

      <View className="flex-row border-t border-border bg-card">
        <TabButton label="Jobs" active={tab === 'jobs'} badge={openCount} onPress={() => setTab('jobs')} />
        <TabButton label="History" active={tab === 'history'} onPress={() => setTab('history')} />
        <TabButton label="Account" active={tab === 'account'} onPress={() => setTab('account')} />
      </View>
    </View>
  )
}

function TabButton({
  label,
  active,
  badge,
  onPress,
}: {
  label: string
  active: boolean
  badge?: number
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className="flex-1 items-center py-3 active:opacity-70"
    >
      <View className={active ? 'mb-2 h-0.5 w-8 rounded-full bg-primary' : 'mb-2 h-0.5 w-8 rounded-full bg-transparent'} />
      <View className="flex-row items-center gap-1.5">
        <Text className={active ? 'text-[13px] font-bold text-primary' : 'text-[13px] font-medium text-muted-foreground'}>
          {label}
        </Text>
        {badge ? (
          <View className="min-w-[18px] items-center rounded-full bg-brand px-1.5 py-px">
            <Text className="text-[10px] font-bold text-white">{badge}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

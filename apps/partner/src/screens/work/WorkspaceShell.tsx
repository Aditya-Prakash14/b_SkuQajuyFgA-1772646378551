import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Pressable, View } from 'react-native'

import { Loading, Text } from '../../components/ui'
import { fetchMyJobs, fetchMyOffers, fetchMyStats, isOpen, setAvailability } from '../../lib/jobs'
import { onPush, registerForPush, unregisterPush } from '../../lib/push'
import { errorMessage, supabase } from '../../lib/supabase'
import type { Job, Offer, Vendor, VendorStats } from '../../lib/types'
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
  const [stats, setStats] = useState<VendorStats | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [online, setOnline] = useState(vendor.is_online)
  const [onlineBusy, setOnlineBusy] = useState(false)
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
      // Stats and offers are secondary: neither may blank the job list.
      const [list, s, o] = await Promise.all([
        fetchMyJobs(),
        fetchMyStats().catch(() => null),
        fetchMyOffers().catch(() => [] as Offer[]),
      ])
      setJobs(list)
      setStats(s)
      setOffers(o)
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
    // Realtime: any change to an order assigned to this vendor (new assignment,
    // reschedule, cancellation) refreshes the list within a second. RLS on
    // orders scopes the stream to our own rows; the filter just cuts noise.
    const channel = supabase
      .channel(`jobs:${vendor.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `assigned_vendor_id=eq.${vendor.id}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prime_now_requests',
          filter: `assigned_vendor_id=eq.${vendor.id}`,
        },
        () => load(),
      )
      .subscribe()

    // Push: register this device for assignment alerts (no-op where unsupported,
    // e.g. Expo Go on Android), refresh on arrival, open the job on tap.
    registerForPush()
    const offPush = onPush({
      onReceived: () => load(),
      onTap: (orderId) => {
        load().then(() => {
          if (orderId) {
            setTab('jobs')
            setSelectedId(orderId)
          }
        })
      },
    })
    return () => {
      sub.remove()
      offPush()
      supabase.removeChannel(channel)
    }
  }, [load, vendor.id])

  // Offers expire in about two minutes and are not delivered over Realtime,
  // so while online we re-check often enough to actually catch one.
  useEffect(() => {
    if (!online) return
    const t = setInterval(() => {
      fetchMyOffers()
        .then(setOffers)
        .catch(() => {})
    }, 15000)
    return () => clearInterval(t)
  }, [online])

  async function toggleOnline(next: boolean) {
    setOnlineBusy(true)
    setOnline(next) // optimistic — the switch must feel instant
    try {
      await setAvailability(next)
      setOffers(next ? await fetchMyOffers().catch(() => []) : [])
    } catch (err) {
      setOnline(!next)
      setError(errorMessage(err, 'Could not change your availability.'))
    } finally {
      setOnlineBusy(false)
    }
  }

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
            offers={offers}
            online={online}
            onlineBusy={onlineBusy}
            refreshing={refreshing}
            error={error}
            onToggleOnline={toggleOnline}
            onRefresh={load}
            onOpen={(j) => setSelectedId(j.id)}
            onOffersChanged={load}
          />
        ) : tab === 'history' ? (
          <HistoryScreen
            jobs={jobs}
            stats={stats}
            refreshing={refreshing}
            error={error}
            onRefresh={load}
            onOpen={(j) => setSelectedId(j.id)}
          />
        ) : (
          <AccountScreen
            vendor={vendor}
            stats={stats}
            onEdit={() => setEditing(true)}
            onSignOut={async () => {
              await unregisterPush() // this phone must stop getting job alerts once signed out
              await supabase.auth.signOut()
            }}
          />
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

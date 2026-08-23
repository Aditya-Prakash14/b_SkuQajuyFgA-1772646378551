import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { Badge, Card, Eyebrow, H1, Muted, Refresher, Screen, Text } from '../../components/ui'
import { fetchBookings, isUpcoming } from '../../lib/bookings'
import { formatDay, formatINR } from '../../lib/format'
import { errorMessage } from '../../lib/supabase'
import { STATUS_LABEL, type Booking } from '../../lib/types'
import type { BookingsStackProps } from '../../navigation/types'

/** Screen 23. Upcoming / Past, both domains in one list. */
export function MyBookingsScreen({ navigation }: BookingsStackProps<'MyBookings'>) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [all, setAll] = useState<Booking[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      setAll(await fetchBookings())
      setError(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not load your bookings.'))
      setAll((prev) => prev ?? [])
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    return navigation.addListener('focus', load)
  }, [load, navigation])

  const list = (all ?? []).filter((b) => (tab === 'upcoming' ? isUpcoming(b) : !isUpcoming(b)))

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingBottom: 32, gap: 16 }}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={load} />}
      >
        <H1>My bookings</H1>

        <View className="flex-row gap-2">
          {(['upcoming', 'past'] as const).map((t) => {
            const active = tab === t
            return (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(t)}
                className={
                  active
                    ? 'min-h-[44px] flex-1 items-center justify-center rounded-pill bg-ink'
                    : 'min-h-[44px] flex-1 items-center justify-center rounded-pill border border-border bg-card'
                }
              >
                <Text className={active ? 'font-bold text-[14px] text-ink-foreground' : 'font-bold text-[14px] text-foreground'}>
                  {t === 'upcoming' ? 'Upcoming' : 'Past'}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {error ? <Muted className="text-destructive">{error}</Muted> : null}

        {list.length === 0 ? (
          <Card>
            <Text className="font-bold text-[15px] text-foreground">
              {tab === 'upcoming' ? 'Nothing booked yet' : 'No past bookings'}
            </Text>
            <Muted className="mt-1 text-[13px]">
              {tab === 'upcoming'
                ? 'Your next booking will appear here.'
                : 'Completed and cancelled bookings show up here.'}
            </Muted>
          </Card>
        ) : (
          <View className="gap-3">
            {list.map((b) => (
              <Pressable
                key={`${b.kind}-${b.id}`}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Tracking', { booking: b })}
              >
                <Card>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        {b.kind === 'now' ? <Badge label="Prime Now" tone="brand" /> : null}
                        <Eyebrow>{b.reference}</Eyebrow>
                      </View>
                      <Text className="mt-1 font-bold text-[15px] leading-5 text-foreground" numberOfLines={2}>
                        {b.items.map((i) => i.service_name).join(', ') || 'Booking'}
                      </Text>
                    </View>
                    <Badge
                      label={STATUS_LABEL[b.status] ?? b.status}
                      tone={
                        b.status === 'completed'
                          ? 'success'
                          : b.status === 'cancelled'
                            ? 'destructive'
                            : 'default'
                      }
                    />
                  </View>

                  <View className="mt-3 flex-row items-end justify-between">
                    <View className="flex-1">
                      <Muted className="text-[13px]">
                        {formatDay(b.scheduledDate)}
                        {b.scheduledSlot ? ` · ${b.scheduledSlot}` : ''}
                      </Muted>
                    </View>
                    <Text className="font-black text-[16px] text-foreground">{formatINR(b.total)}</Text>
                  </View>

                  <Text className="mt-2 font-bold text-[13px] text-primary">
                    {/* Only Deep Cleaning can be rated: submit_review is keyed
                        to an order line, and Prime Now has no order. */}
                    {b.status === 'completed' && b.kind === 'deep'
                      ? 'Rate your helper ›'
                      : isUpcoming(b)
                        ? 'Track booking ›'
                        : 'View details ›'}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

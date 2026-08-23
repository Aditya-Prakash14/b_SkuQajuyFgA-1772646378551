import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'

import { Badge, Card, Eyebrow, H1, H2, Muted, Screen, Text } from '../../components/ui'
import { fetchBookings, isUpcoming } from '../../lib/bookings'
import { formatDay, formatINR, splitPriceLabel } from '../../lib/format'
import { useSession } from '../../lib/session'
import { STATUS_LABEL, type Booking } from '../../lib/types'
import type { HomeStackProps } from '../../navigation/types'

/**
 * Screen 10. The whole product is two domains, so the home screen presents
 * exactly those two and never a list of services — browsing starts one level
 * down, the same rule the website follows.
 */
export function HomeScreen({ navigation }: HomeStackProps<'Home'>) {
  const { draft, profile, defaultAddress } = useSession()
  const [recent, setRecent] = useState<Booking[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      setRecent(await fetchBookings())
    } catch {
      // A failed rebook strip must never block the home screen.
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    return navigation.addListener('focus', load)
  }, [load, navigation])

  const firstName = (profile?.name || draft.name || '').split(' ')[0]
  const live = recent.find(isUpcoming)
  const lastDone = recent.find((b) => b.status === 'completed' && b.kind === 'deep')

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingBottom: 32, gap: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Pressable accessibilityRole="button" className="flex-row items-center gap-1.5">
              <Eyebrow className="text-primary">
                {defaultAddress ? `${defaultAddress.label ?? 'Home'} · ${defaultAddress.city}` : 'Set your address'}
              </Eyebrow>
            </Pressable>
            <H1 className="mt-1.5">{firstName ? `Hello, ${firstName}` : 'Hello'}</H1>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-pill bg-secondary">
            <Text className="font-black text-[16px] text-primary">
              {(firstName || 'G').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Live booking takes priority over anything promotional. */}
        {live ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.getParent()?.navigate('BookingsTab' as never)}
          >
            <Card className="border-primary">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Eyebrow className="text-primary">In progress</Eyebrow>
                  <Text className="mt-1 font-bold text-[15px] text-foreground" numberOfLines={1}>
                    {live.items[0]?.service_name ?? 'Booking'}
                  </Text>
                  <Muted className="text-[12px]">
                    {live.reference} · {STATUS_LABEL[live.status] ?? live.status}
                  </Muted>
                </View>
                <Badge label="Track" tone="default" />
              </View>
            </Card>
          </Pressable>
        ) : null}

        <View className="gap-3">
          <H2>What do you need?</H2>

          {/* Domain 01 — light */}
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Categories')}>
            <Card className="gap-5">
              <View>
                <Eyebrow className="text-primary">Domain 01 · scheduled</Eyebrow>
                <Text className="mt-2 font-black text-[24px] text-foreground" style={{ letterSpacing: -0.6 }}>
                  Deep Cleaning
                </Text>
                <Muted className="mt-1.5">
                  Homes, offices, floors and painting. Booked in advance at a flat price.
                </Muted>
              </View>
              <View className="flex-row items-end justify-between">
                <View>
                  <Eyebrow>From</Eyebrow>
                  <Text className="font-black text-[22px] text-foreground">₹1,499</Text>
                </View>
                <Text className="font-bold text-[14px] text-primary">Browse categories ›</Text>
              </View>
            </Card>
          </Pressable>

          {/* Domain 02 — dark */}
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('PrimeSlot')}>
            <View className="gap-5 rounded-lg bg-ink p-4">
              <View>
                <Eyebrow className="text-brand">Domain 02 · by the hour</Eyebrow>
                <Text className="mt-2 font-black text-[24px] text-ink-foreground" style={{ letterSpacing: -0.6 }}>
                  Prime Now
                </Text>
                <Text className="mt-1.5 font-sans text-[14px] leading-[21px] text-ink-foreground/70">
                  Instant house help. Tell us what needs doing — a verified helper is on the way.
                </Text>
              </View>
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="font-mono text-[11px] uppercase text-ink-foreground/60" style={{ letterSpacing: 1.4 }}>
                    From
                  </Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="font-black text-[22px] text-ink-foreground">₹199</Text>
                    <Text className="font-sans text-[12px] text-ink-foreground/60">/ 30 min</Text>
                  </View>
                </View>
                <Text className="font-bold text-[14px] text-brand">Get help now ›</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Rebook strip */}
        {lastDone ? (
          <View className="gap-2">
            <Eyebrow>Book again</Eyebrow>
            <Card>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-bold text-[15px] text-foreground" numberOfLines={1}>
                    {lastDone.items[0]?.service_name}
                  </Text>
                  <Muted className="text-[12px]">
                    Last on {formatDay(lastDone.scheduledDate)} · {formatINR(lastDone.total)}
                  </Muted>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('Categories')}
                  className="rounded-pill bg-secondary px-4 py-2.5"
                >
                  <Text className="font-bold text-[13px] text-primary">Rebook</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        ) : null}

        <Card className="bg-secondary">
          <Text className="font-bold text-[14px] text-foreground">
            Not happy? We will come back and re-clean at no extra cost.
          </Text>
          <Muted className="mt-1 text-[12px]">Verified Professionals · Eco-Friendly Products · On-Time Service</Muted>
        </Card>
      </ScrollView>
    </Screen>
  )
}

export { splitPriceLabel }

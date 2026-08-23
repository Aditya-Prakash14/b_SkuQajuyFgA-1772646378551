import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { Badge, Card, Eyebrow, Field, H1, H2, Muted, Refresher, Screen, Text } from '../../components/ui'
import { fetchBookings, isUpcoming, rebookLines } from '../../lib/bookings'
import { useCart } from '../../lib/cart'
import { fetchAllServices, searchServices } from '../../lib/catalog'
import { formatDay, formatINR, splitPriceLabel } from '../../lib/format'
import { useSession } from '../../lib/session'
import { STATUS_LABEL, type Booking, type Service } from '../../lib/types'
import type { HomeStackProps } from '../../navigation/types'

/**
 * Screen 10. The whole product is two domains, so the home screen presents
 * exactly those two and never a list of services — browsing starts one level
 * down, the same rule the website follows. Search is the one shortcut: it
 * filters the Deep Cleaning catalogue locally and jumps to a service.
 */
export function HomeScreen({ navigation }: HomeStackProps<'Home'>) {
  const { draft, profile, defaultAddress } = useSession()
  const { addLines } = useCart()
  const [recent, setRecent] = useState<Booking[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [all, setAll] = useState<Service[] | null>(null)
  const [rebooking, setRebooking] = useState(false)
  const [note, setNote] = useState<string | null>(null)

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

  // The catalogue is loaded once, the first time someone types.
  useEffect(() => {
    if (query.trim().length >= 2 && all === null) {
      fetchAllServices()
        .then(setAll)
        .catch(() => setAll([]))
    }
  }, [query, all])

  const firstName = (profile?.name || draft.name || '').split(' ')[0]
  const live = recent.find(isUpcoming)
  const lastDone = recent.find((b) => b.status === 'completed' && b.kind === 'deep')
  const searching = query.trim().length >= 2
  const results = searching && all ? searchServices(all, query) : []

  async function rebook(b: Booking) {
    setRebooking(true)
    setNote(null)
    try {
      const { lines } = await rebookLines(b)
      if (lines.length === 0) {
        setNote('Those services are no longer offered. Browse the catalogue for what replaced them.')
        return
      }
      addLines(lines)
      navigation.navigate('Cart')
    } catch {
      setNote('Could not rebuild that booking. Please try again.')
    } finally {
      setRebooking(false)
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingBottom: 32, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<Refresher refreshing={refreshing} onRefresh={load} />}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change address"
              onPress={() => navigation.navigate('Addresses')}
              className="min-h-[32px] flex-row items-center gap-1.5"
            >
              <Eyebrow className="text-primary">
                {defaultAddress ? `${defaultAddress.label ?? 'Home'} · ${defaultAddress.city} ›` : 'Set your address ›'}
              </Eyebrow>
            </Pressable>
            <H1 className="mt-1.5">{firstName ? `Hello, ${firstName}` : 'Hello'}</H1>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => navigation.getParent()?.navigate('AccountTab' as never)}
            className="h-11 w-11 items-center justify-center rounded-pill bg-secondary"
          >
            <Text className="font-black text-[16px] text-primary">{(firstName || 'G').charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <Field
            value={query}
            onChangeText={setQuery}
            placeholder="Search Deep Cleaning — sofa, kitchen, marble…"
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search services"
          />
          {searching ? (
            <Card className="gap-0 p-0">
              {all === null ? (
                <Muted className="p-4 text-[13px]">Searching…</Muted>
              ) : results.length === 0 ? (
                <Muted className="p-4 text-[13px]">No matches. Try "sofa", "kitchen" or "pest".</Muted>
              ) : (
                results.slice(0, 8).map((s, i) => {
                  const price = splitPriceLabel(s.priceLabel)
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setQuery('')
                        navigation.navigate('ServiceDetail', { serviceId: s.id })
                      }}
                      className={
                        i === 0
                          ? 'flex-row items-center justify-between gap-3 px-4 py-3'
                          : 'flex-row items-center justify-between gap-3 border-t border-border px-4 py-3'
                      }
                    >
                      <View className="flex-1">
                        <Text className="font-bold text-[14px] text-foreground">{s.name}</Text>
                        <Eyebrow>{s.categoryName}</Eyebrow>
                      </View>
                      <View className="items-end">
                        <Text className="font-black text-[14px] text-foreground">{price.amount}</Text>
                        {price.unit ? <Muted className="text-[10px]">/ {price.unit}</Muted> : null}
                      </View>
                    </Pressable>
                  )
                })
              )}
            </Card>
          ) : null}
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
                  <Eyebrow className="text-primary">{live.kind === 'now' ? 'Prime Now' : 'Upcoming'}</Eyebrow>
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
                    {lastDone.items.map((i) => i.service_name).join(', ')}
                  </Text>
                  <Muted className="text-[12px]">
                    Last on {formatDay(lastDone.scheduledDate)} · {formatINR(lastDone.total)}
                  </Muted>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={rebooking}
                  onPress={() => rebook(lastDone)}
                  className="rounded-pill bg-secondary px-4 py-2.5"
                >
                  <Text className="font-bold text-[13px] text-primary">{rebooking ? 'Adding…' : 'Rebook'}</Text>
                </Pressable>
              </View>
              {note ? <Muted className="mt-2 text-[12px] text-destructive">{note}</Muted> : null}
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

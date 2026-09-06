import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { setStatusBarStyle } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useState } from 'react'
import { Image, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Card, Eyebrow, Field, H2, Muted, Refresher, Screen, Text } from '../../components/ui'
import { track } from '../../lib/analytics'
import { fetchBookings, isUpcoming, rebookLines } from '../../lib/bookings'
import { useCart } from '../../lib/cart'
import { fetchAllServices, fetchCategories, searchServices } from '../../lib/catalog'
import { formatDay, formatINR, splitPriceLabel } from '../../lib/format'
import { useSession } from '../../lib/session'
import { useColors } from '../../lib/theme'
import { STATUS_LABEL, type Booking, type Category, type Service } from '../../lib/types'
import type { HomeStackProps } from '../../navigation/types'

const DEEP_PHOTO = require('../../../assets/intro/deep.jpg')
const NOW_PHOTO = require('../../../assets/intro/now.jpg')

/** Category chips cycle through the palette's tints — colour, not decoration. */
const TINTS = ['bg-secondary', 'bg-brand/20', 'bg-success/12', 'bg-warning/15']

/** The services worth surfacing first; matched by name so a renamed slug cannot break it. */
const POPULAR = ['1 BHK', 'Sofa', 'Kitchen', 'Bathroom', 'Pest', 'Marble']

const TRUST = ['Verified Professionals', 'Eco-Friendly Products', 'On-Time Service']

function pickPopular(all: Service[]): Service[] {
  const picked: Service[] = []
  for (const key of POPULAR) {
    const s = all.find((x) => x.name.toLowerCase().includes(key.toLowerCase()) && !picked.includes(x))
    if (s) picked.push(s)
  }
  for (const s of all) {
    if (picked.length >= 6) break
    if (!picked.includes(s)) picked.push(s)
  }
  return picked.slice(0, 6)
}

/**
 * Screen 10. The whole product is two domains, so the home screen presents
 * exactly those two and never a full list of services — browsing starts one
 * level down, the same rule the website follows. What it does carry: a
 * search shortcut, a strip of the popular services with their photos, and
 * the category chips, so the page has the colour of the work itself.
 */
export function HomeScreen({ navigation }: HomeStackProps<'Home'>) {
  const { draft, profile, defaultAddress } = useSession()
  const { addLines } = useCart()
  const colors = useColors()
  const { colorScheme } = useColorScheme()
  const [recent, setRecent] = useState<Booking[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [popular, setPopular] = useState<Service[]>([])
  const [all, setAll] = useState<Service[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [rebooking, setRebooking] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const [bookings, cats, services] = await Promise.all([
        fetchBookings().catch(() => [] as Booking[]),
        fetchCategories().catch(() => [] as Category[]),
        fetchAllServices().catch(() => [] as Service[]),
      ])
      setRecent(bookings)
      setCategories(cats)
      setAll(services)
      setPopular(pickPopular(services))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    return navigation.addListener('focus', load)
  }, [load, navigation])

  // The teal band runs under the status bar, so its icons go light while this
  // screen is in front — and back to the theme's style the moment it is not.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light')
      return () => setStatusBarStyle(colorScheme === 'dark' ? 'light' : 'dark')
    }, [colorScheme]),
  )

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
      navigation.getParent()?.navigate('CartTab' as never)
    } catch {
      setNote('Could not rebuild that booking. Please try again.')
    } finally {
      setRebooking(false)
    }
  }

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<Refresher refreshing={refreshing} onRefresh={load} />}
      >
        {/* Teal band: the greeting, the address, and room for the search card to overlap. */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.deep }} className="px-[22px] pb-14 pt-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change address"
                onPress={() => navigation.navigate('Addresses')}
                className="min-h-[32px] flex-row items-center"
              >
                <Eyebrow className="text-brand">
                  {defaultAddress ? `${defaultAddress.label ?? 'Home'} · ${defaultAddress.city} ›` : 'Set your address ›'}
                </Eyebrow>
              </Pressable>
              <Text className="mt-1 font-black text-[30px] leading-[36px] text-white" style={{ letterSpacing: -0.9 }}>
                {firstName ? `Hello, ${firstName}` : 'Hello'}
              </Text>
              <Text className="mt-1 font-sans text-[14px] text-white/75">What needs doing today?</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Account"
              onPress={() => navigation.getParent()?.navigate('AccountTab' as never)}
              className="h-11 w-11 items-center justify-center rounded-pill border border-white/20 bg-white/15"
            >
              <Text className="font-black text-[16px] text-white">{(firstName || 'G').charAt(0).toUpperCase()}</Text>
            </Pressable>
          </View>
        </SafeAreaView>

        {/* The search card sits across the band's edge — the one place the spec allows a shadow. */}
        <View className="-mt-9 px-[22px]">
          <View
            className="rounded-lg bg-card p-2"
            style={{
              shadowColor: colors.ink,
              shadowOpacity: 0.1,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 5,
            }}
          >
            <Field
              value={query}
              onChangeText={setQuery}
              placeholder="Search — sofa, kitchen, marble, pest…"
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Search services"
            />
          </View>
          {searching ? (
            <Card className="mt-2 gap-0 p-0">
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

        <View className="gap-5 px-[22px] pt-5">
          {/* Live booking takes priority over anything promotional. */}
          {live ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.getParent()?.navigate('BookingsTab' as never)}
            >
              <Card className="border-primary bg-secondary">
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

          {/* Domain 01 — light, with a photo */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              track('view_domain', { domain: 'deep' })
              navigation.navigate('Categories')
            }}
          >
            <View className="overflow-hidden rounded-lg border border-border bg-card">
              <Image
                source={DEEP_PHOTO}
                resizeMode="cover"
                className="h-36 w-full"
                accessible
                accessibilityLabel="A sofa being deep cleaned"
              />
              <View className="gap-3 p-4">
                <View>
                  <Eyebrow className="text-primary">Domain 01 · scheduled</Eyebrow>
                  <Text className="mt-1.5 font-black text-[22px] text-foreground" style={{ letterSpacing: -0.6 }}>
                    Deep Cleaning
                  </Text>
                  <Muted className="mt-1">Homes, offices, floors and painting. Booked in advance at a flat price.</Muted>
                </View>
                <View className="flex-row items-end justify-between">
                  <View>
                    <Eyebrow>From</Eyebrow>
                    <Text className="font-black text-[20px] text-foreground">₹1,499</Text>
                  </View>
                  <View className="rounded-pill bg-primary px-4 py-2.5">
                    <Text className="font-bold text-[13px] text-primary-foreground">Browse categories ›</Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>

          {/* Domain 02 — dark, amber accents, with a photo */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              track('view_domain', { domain: 'now' })
              navigation.navigate('PrimeDescribe')
            }}
          >
            <View className="overflow-hidden rounded-lg bg-ink">
              <Image
                source={NOW_PHOTO}
                resizeMode="cover"
                className="h-36 w-full"
                accessible
                accessibilityLabel="A kitchen being cleaned"
              />
              <View className="gap-3 p-4">
                <View>
                  <Eyebrow className="text-brand">Domain 02 · by the hour</Eyebrow>
                  <View className="mt-1.5 flex-row items-center gap-2">
                    <Ionicons name="flash" size={20} color={colors.brand} />
                    <Text className="font-black text-[22px] text-ink-foreground" style={{ letterSpacing: -0.6 }}>
                      Prime Now
                    </Text>
                  </View>
                  <Text className="mt-1 font-sans text-[14px] leading-[21px] text-ink-foreground/70">
                    Instant house help. Tell us what needs doing — a verified helper is on the way.
                  </Text>
                </View>
                <View className="flex-row items-end justify-between">
                  <View>
                    <Text className="font-mono text-[11px] uppercase text-ink-foreground/60" style={{ letterSpacing: 1.4 }}>
                      From
                    </Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="font-black text-[20px] text-ink-foreground">₹199</Text>
                      <Text className="font-sans text-[12px] text-ink-foreground/60">/ 30 min</Text>
                    </View>
                  </View>
                  <View className="rounded-pill bg-brand px-4 py-2.5">
                    <Text className="font-bold text-[13px] text-brand-foreground">Get help now ›</Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>

          {/* Popular services, with their photos */}
          {popular.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-baseline justify-between">
                <H2>Popular right now</H2>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Categories')}>
                  <Text className="font-bold text-[13px] text-primary">See all ›</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-[22px]"
                contentContainerStyle={{ paddingHorizontal: 22, gap: 12 }}
              >
                {popular.map((s) => {
                  const price = splitPriceLabel(s.priceLabel)
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.name}, ${s.priceLabel}`}
                      onPress={() => navigation.navigate('ServiceDetail', { serviceId: s.id })}
                      className="w-[156px] overflow-hidden rounded-lg border border-border bg-card active:opacity-85"
                    >
                      <View className="h-24 w-full bg-secondary">
                        {s.image ? <Image source={{ uri: s.image }} className="h-full w-full" resizeMode="cover" /> : null}
                      </View>
                      <View className="gap-1 p-3">
                        <Text className="font-bold text-[13px] leading-[18px] text-foreground" numberOfLines={2}>
                          {s.name}
                        </Text>
                        <View className="flex-row items-baseline gap-1">
                          <Text className="font-black text-[14px] text-foreground">{price.amount}</Text>
                          {price.unit ? <Muted className="text-[10px]">/ {price.unit}</Muted> : null}
                        </View>
                      </View>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Category chips, tinted */}
          {categories.length > 0 ? (
            <View className="gap-3">
              <H2>Browse by category</H2>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((c, i) => (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('Services', { categoryId: c.id, categoryName: c.name })}
                    className={`min-h-[44px] flex-row items-center gap-2 rounded-pill px-4 py-2 active:opacity-80 ${TINTS[i % TINTS.length]}`}
                  >
                    <Text className="font-bold text-[13px] text-foreground">{c.name}</Text>
                    <Text className="font-mono text-[11px] text-muted-foreground">{c.serviceCount}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

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
                    className="rounded-pill bg-primary px-4 py-2.5"
                  >
                    <Text className="font-bold text-[13px] text-primary-foreground">{rebooking ? 'Adding…' : 'Rebook'}</Text>
                  </Pressable>
                </View>
                {note ? <Muted className="mt-2 text-[12px] text-destructive">{note}</Muted> : null}
              </Card>
            </View>
          ) : null}

          {/* Trust */}
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              {TRUST.map((t) => (
                <View key={t} className="flex-row items-center gap-1.5 rounded-pill border border-border bg-card px-3 py-2">
                  <Text className="font-bold text-[12px] text-success">✓</Text>
                  <Text className="font-medium text-[12px] text-foreground">{t}</Text>
                </View>
              ))}
            </View>
            <Card className="border-0 bg-brand/20">
              <Text className="font-bold text-[14px] text-foreground">
                Not happy? We will come back and re-clean at no extra cost.
              </Text>
              <Muted className="mt-1 text-[12px]">Tell us within 48 hours of the visit.</Muted>
            </Card>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

export { splitPriceLabel }

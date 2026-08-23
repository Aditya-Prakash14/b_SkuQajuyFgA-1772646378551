import { useEffect, useState, type ReactNode } from 'react'
import { Image, Pressable, ScrollView, View } from 'react-native'

import {
  Banner,
  Button,
  Card,
  Eyebrow,
  Field,
  H1,
  Loading,
  Muted,
  Screen,
  StickyBar,
  Text,
} from '../../components/ui'
import { useCart } from '../../lib/cart'
import { fetchPublicReviews, fetchService, unitWord } from '../../lib/catalog'
import { formatDay, formatINR, splitPriceLabel } from '../../lib/format'
import { errorMessage } from '../../lib/supabase'
import type { Review, Service } from '../../lib/types'
import type { HomeStackProps } from '../../navigation/types'

/**
 * Screen 13. Everything the catalogue knows about a service: photos, the
 * "What's included" checklist, what we clean, how it works, what is not
 * included, the service's own FAQs and public reviews — the website fetches
 * most of this and renders a fraction; the app shows it all.
 *
 * Per-unit services ask for the area here. Without it create_booking refuses
 * the line — pricing the rate as if it were the whole job is what produced ₹5
 * orders before.
 */
export function ServiceDetailScreen({ route, navigation }: HomeStackProps<'ServiceDetail'>) {
  const { serviceId } = route.params
  const { add } = useCart()
  const [service, setService] = useState<Service | null | 'missing'>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [units, setUnits] = useState('')
  const [photo, setPhoto] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchService(serviceId)
      .then((s) => setService(s ?? 'missing'))
      .catch((err) => {
        setError(errorMessage(err, 'Could not load this service.'))
        setService('missing')
      })
    fetchPublicReviews(serviceId)
      .then(setReviews)
      .catch(() => {})
  }, [serviceId])

  if (service === null) return <Loading />
  if (service === 'missing') {
    return (
      <Screen edges={[]}>
        <View className="flex-1 items-center justify-center p-8">
          <Muted>{error ?? 'This service is no longer available.'}</Muted>
        </View>
      </Screen>
    )
  }

  const price = splitPriceLabel(service.priceLabel)
  const perUnit = service.priceUnit !== 'fixed'
  const parsed = Number(units)
  const validUnits = Number.isFinite(parsed) && parsed > 0
  const estimate = perUnit ? service.rate * (validUnits ? parsed : 0) : service.rate
  const unit = unitWord(service.priceUnit, service.priceLabel)
  const photos = [service.image, ...service.gallery].filter((u, i, arr): u is string => !!u && arr.indexOf(u) === i)

  function addToCart() {
    if (perUnit && !validUnits) {
      setError(`Tell us roughly how many ${unit} so we can price the job.`)
      return
    }
    setError(null)
    add(service as Service, perUnit ? parsed : 1)
    navigation.navigate('Cart')
  }

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="h-[240px] w-full bg-secondary">
          {photos[photo] ? (
            <Image
              source={{ uri: photos[photo] }}
              className="h-full w-full"
              resizeMode="cover"
              accessible
              accessibilityLabel={`${service.name}, photo ${photo + 1} of ${photos.length}`}
            />
          ) : null}
        </View>
        {photos.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, gap: 8 }}
          >
            {photos.map((uri, i) => (
              <Pressable
                key={uri}
                accessibilityRole="button"
                accessibilityLabel={`Show photo ${i + 1}`}
                accessibilityState={{ selected: i === photo }}
                onPress={() => setPhoto(i)}
                className={
                  i === photo
                    ? 'h-14 w-14 overflow-hidden rounded-md border-2 border-primary'
                    : 'h-14 w-14 overflow-hidden rounded-md border border-border'
                }
              >
                <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View className="gap-4 p-[22px]">
          <View className="gap-2">
            <Eyebrow className="text-primary">
              {service.categoryName}
              {service.duration ? ` · ${service.duration}` : ''}
            </Eyebrow>
            <H1>{service.name}</H1>
            {service.tagline ? <Muted>{service.tagline}</Muted> : null}
            {service.reviewsCount > 0 ? (
              <Muted className="text-[13px]">
                ★ {service.rating.toFixed(1)} · {service.reviewsCount} {service.reviewsCount === 1 ? 'review' : 'reviews'}
              </Muted>
            ) : null}
          </View>

          {error ? <Banner>{error}</Banner> : null}

          {service.description ? <Muted>{service.description}</Muted> : null}

          {perUnit ? (
            <Card className="bg-secondary">
              <Field
                label={`How many ${unit}?`}
                value={units}
                onChangeText={(t) => {
                  setUnits(t.replace(/[^0-9.]/g, ''))
                  setError(null)
                }}
                keyboardType="decimal-pad"
                placeholder={service.priceUnit === 'per_sqft' ? 'e.g. 500' : 'e.g. 6'}
              />
              <View className="mt-3 flex-row items-baseline justify-between">
                <Muted>Estimated total</Muted>
                <Text className="font-black text-[18px] text-foreground">
                  {validUnits ? formatINR(estimate) : '—'}
                </Text>
              </View>
              <Muted className="mt-1 text-[11px]">
                An estimate. We confirm the final area on site before starting.
              </Muted>
            </Card>
          ) : null}

          {service.includes.length > 0 ? (
            <Section title="What's included">
              {service.includes.map((item) => (
                <Tick key={item}>{item}</Tick>
              ))}
            </Section>
          ) : null}

          {service.whatWeClean.length > 0 ? (
            <Section title="What we clean">
              {service.whatWeClean.map((item) => (
                <Tick key={item}>{item}</Tick>
              ))}
            </Section>
          ) : null}

          {service.howItWorks.length > 0 ? (
            <Section title="How it works">
              {service.howItWorks.map((s, i) => (
                <View key={`${s.step}-${i}`} className="flex-row gap-3">
                  <Text className="w-7 font-mono text-[12px] text-primary">{String(i + 1).padStart(2, '0')}</Text>
                  <View className="flex-1">
                    <Text className="font-bold text-[14px] text-foreground">{s.title}</Text>
                    {s.desc ? <Muted className="text-[13px]">{s.desc}</Muted> : null}
                  </View>
                </View>
              ))}
            </Section>
          ) : null}

          {service.notIncluded.length > 0 ? (
            <Section title="Not included">
              {service.notIncluded.map((item) => (
                <View key={item} className="flex-row gap-2.5">
                  <Text className="font-bold text-[14px] text-muted-foreground">–</Text>
                  <Muted className="flex-1">{item}</Muted>
                </View>
              ))}
            </Section>
          ) : null}

          {service.faqs.length > 0 ? (
            <Section title="Questions">
              {service.faqs.map((f, i) => {
                const open = openFaq === i
                return (
                  <Pressable
                    key={f.q}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenFaq(open ? null : i)}
                    className="rounded-md border border-border bg-card p-3"
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 font-bold text-[14px] leading-5 text-foreground">{f.q}</Text>
                      <Text className="font-bold text-[16px] text-primary">{open ? '–' : '+'}</Text>
                    </View>
                    {open ? <Muted className="mt-2 text-[13px]">{f.a}</Muted> : null}
                  </Pressable>
                )
              })}
            </Section>
          ) : null}

          {reviews.length > 0 ? (
            <Section title="What customers say">
              {reviews.map((r) => (
                <Card key={r.id} className="gap-1">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="font-bold text-[14px] text-foreground">{r.reviewer || 'A customer'}</Text>
                    <Text className="text-[13px] text-brand">{'★'.repeat(r.rating)}</Text>
                  </View>
                  {r.comment ? <Muted className="text-[13px]">{r.comment}</Muted> : null}
                  <Eyebrow>{formatDay(r.created_at.slice(0, 10))}</Eyebrow>
                </Card>
              ))}
            </Section>
          ) : null}

          <Card className="bg-secondary">
            <Text className="font-bold text-[13px] text-foreground">
              Not happy? We will come back and re-clean at no extra cost.
            </Text>
          </Card>
        </View>
      </ScrollView>

      <StickyBar>
        <View>
          <View className="flex-row items-baseline gap-1">
            <Text className="font-black text-[20px] text-foreground">
              {perUnit && validUnits ? formatINR(estimate) : price.amount}
            </Text>
            {perUnit && !validUnits && price.unit ? <Muted className="text-[11px]">/ {price.unit}</Muted> : null}
          </View>
          <Eyebrow>{perUnit ? 'Estimate · incl. GST' : 'Flat · incl. GST'}</Eyebrow>
        </View>
        <Button label="Add to cart" onPress={addToCart} className="flex-1" />
      </StickyBar>
    </Screen>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2.5">
      <Text className="font-black text-[17px] text-foreground">{title}</Text>
      {children}
    </View>
  )
}

function Tick({ children }: { children: string }) {
  return (
    <View className="flex-row gap-2.5">
      <Text className="font-bold text-[14px] text-primary">✓</Text>
      <Muted className="flex-1 text-foreground">{children}</Muted>
    </View>
  )
}

import { useEffect, useState } from 'react'
import { Image, Pressable, View } from 'react-native'

import { Banner, Body, Eyebrow, H1, Loading, Muted, Screen, Text } from '../../components/ui'
import { fetchServicesInCategory } from '../../lib/catalog'
import { splitPriceLabel } from '../../lib/format'
import { useCart } from '../../lib/cart'
import { errorMessage } from '../../lib/supabase'
import type { Service } from '../../lib/types'
import type { HomeStackProps } from '../../navigation/types'

/** Screen 12. Every service in one category. */
export function ServicesScreen({ route, navigation }: HomeStackProps<'Services'>) {
  const { categoryId, categoryName } = route.params
  const { add, lines } = useCart()
  const [items, setItems] = useState<Service[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchServicesInCategory(categoryId)
      .then(setItems)
      .catch((err) => {
        setError(errorMessage(err, 'Could not load these services.'))
        setItems([])
      })
  }, [categoryId])

  if (!items) return <Loading label="Loading…" />

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <Eyebrow className="text-primary">Deep Cleaning</Eyebrow>
          <H1>{categoryName}</H1>
          <Eyebrow>
            {items.length} {items.length === 1 ? 'service' : 'services'}
          </Eyebrow>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <View className="gap-3">
          {items.map((s) => {
            const price = splitPriceLabel(s.priceLabel)
            const inCart = lines.some((l) => l.serviceId === s.id)
            const perUnit = s.priceUnit !== 'fixed'
            return (
              <View key={s.id} className="flex-row items-center gap-4 rounded-lg border border-border bg-card p-3">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('ServiceDetail', { serviceId: s.id })}
                  className="h-[72px] w-[72px] overflow-hidden rounded-md bg-secondary"
                >
                  {s.image ? <Image source={{ uri: s.image }} className="h-full w-full" resizeMode="cover" /> : null}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('ServiceDetail', { serviceId: s.id })}
                  className="flex-1"
                >
                  <Text className="font-bold text-[15px] leading-5 text-foreground">{s.name}</Text>
                  {s.duration ? <Eyebrow className="mt-1">{s.duration}</Eyebrow> : null}
                  <View className="mt-1.5 flex-row items-baseline gap-1">
                    <Text className="font-black text-[16px] text-foreground">{price.amount}</Text>
                    {price.unit ? <Muted className="text-[11px]">/ {price.unit}</Muted> : null}
                  </View>
                </Pressable>

                {/* A per-unit service needs an area, which only fits on the
                    detail screen — so the row sends you there instead of
                    silently adding an unpriced line. */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    perUnit ? navigation.navigate('ServiceDetail', { serviceId: s.id }) : add(s)
                  }
                  className={
                    inCart
                      ? 'min-h-[44px] justify-center rounded-pill bg-secondary px-4'
                      : 'min-h-[44px] justify-center rounded-pill border border-primary px-4 active:opacity-80'
                  }
                >
                  <Text className="font-bold text-[13px] text-primary">
                    {inCart ? 'Added' : perUnit ? 'Select' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            )
          })}
        </View>
      </Body>
    </Screen>
  )
}

import { useEffect, useState } from 'react'
import { Image, Pressable, View } from 'react-native'

import { Banner, Body, Eyebrow, H1, Loading, Muted, Screen, Text } from '../../components/ui'
import { fetchCategories } from '../../lib/catalog'
import { splitPriceLabel } from '../../lib/format'
import { errorMessage } from '../../lib/supabase'
import type { Category } from '../../lib/types'
import type { HomeStackProps } from '../../navigation/types'

/** Screen 11. Category rows — never a nested grid of services. */
export function CategoriesScreen({ navigation }: HomeStackProps<'Categories'>) {
  const [items, setItems] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
      .then(setItems)
      .catch((err) => {
        setError(errorMessage(err, 'Could not load the catalogue.'))
        setItems([])
      })
  }, [])

  if (!items) return <Loading label="Loading services…" />

  return (
    <Screen edges={[]}>
      <Body>
        <View className="gap-2">
          <Eyebrow className="text-primary">Domain 01</Eyebrow>
          <H1>Deep Cleaning</H1>
          <Muted>Flat prices, agreed before we start.</Muted>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <View className="gap-3">
          {items.map((c) => {
            const price = splitPriceLabel(c.fromPriceLabel)
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Services', { categoryId: c.id, categoryName: c.name })}
                className="flex-row items-center gap-4 rounded-lg border border-border bg-card p-3 active:opacity-85"
              >
                <View className="h-[72px] w-[72px] overflow-hidden rounded-md bg-secondary">
                  {c.image ? (
                    <Image source={{ uri: c.image }} className="h-full w-full" resizeMode="cover" />
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-[16px] text-foreground">{c.name}</Text>
                  <Eyebrow className="mt-1">
                    {c.serviceCount} {c.serviceCount === 1 ? 'service' : 'services'}
                  </Eyebrow>
                </View>
                <View className="items-end">
                  <Eyebrow>From</Eyebrow>
                  <Text className="font-black text-[17px] text-foreground">{price.amount}</Text>
                  {/* Per-unit prices get their own line so a card never overflows
                      and "₹5" is never mistaken for the whole job. */}
                  {price.unit ? <Muted className="text-[11px]">/ {price.unit}</Muted> : null}
                </View>
              </Pressable>
            )
          })}
        </View>
      </Body>
    </Screen>
  )
}

import { useEffect, useState } from 'react'
import { Image, ScrollView, View } from 'react-native'

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
import { fetchService } from '../../lib/catalog'
import { formatINR, splitPriceLabel } from '../../lib/format'
import { errorMessage } from '../../lib/supabase'
import type { Service } from '../../lib/types'
import type { HomeStackProps } from '../../navigation/types'

/**
 * Screen 13. Hero, description, the six-item "What's included" checklist, and a
 * sticky bottom bar with the price and Add to cart.
 *
 * Per-unit services ask for the area here. Without it create_booking refuses
 * the line — pricing the rate as if it were the whole job is what produced ₹5
 * orders before.
 */
export function ServiceDetailScreen({ route, navigation }: HomeStackProps<'ServiceDetail'>) {
  const { serviceId } = route.params
  const { add } = useCart()
  const [service, setService] = useState<Service | null | 'missing'>(null)
  const [units, setUnits] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchService(serviceId)
      .then((s) => setService(s ?? 'missing'))
      .catch((err) => {
        setError(errorMessage(err, 'Could not load this service.'))
        setService('missing')
      })
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
  const unitWord = price.unit ?? (service.priceUnit === 'per_panel' ? 'panel' : 'sq. ft.')

  function addToCart() {
    if (perUnit && !validUnits) {
      setError(`Tell us roughly how many ${unitWord} so we can price the job.`)
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
          {service.image ? (
            <Image source={{ uri: service.image }} className="h-full w-full" resizeMode="cover" />
          ) : null}
        </View>

        <View className="gap-4 p-[22px]">
          <View className="gap-2">
            <Eyebrow className="text-primary">
              {service.categoryName}
              {service.duration ? ` · ${service.duration}` : ''}
            </Eyebrow>
            <H1>{service.name}</H1>
            {service.tagline ? <Muted>{service.tagline}</Muted> : null}
          </View>

          {error ? <Banner>{error}</Banner> : null}

          {service.description ? <Muted>{service.description}</Muted> : null}

          {perUnit ? (
            <Card className="bg-secondary">
              <Field
                label={`How many ${unitWord}?`}
                value={units}
                onChangeText={(t) => {
                  setUnits(t.replace(/[^0-9.]/g, ''))
                  setError(null)
                }}
                keyboardType="decimal-pad"
                placeholder={service.priceUnit === 'per_panel' ? 'e.g. 6' : 'e.g. 500'}
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
            <View className="gap-2.5">
              <Text className="font-black text-[17px] text-foreground">What&apos;s included</Text>
              {service.includes.map((item) => (
                <View key={item} className="flex-row gap-2.5">
                  <Text className="font-bold text-[14px] text-primary">✓</Text>
                  <Muted className="flex-1 text-foreground">{item}</Muted>
                </View>
              ))}
            </View>
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
          <Eyebrow>{perUnit ? 'Estimate' : 'Flat price'}</Eyebrow>
        </View>
        <Button label="Add to cart" onPress={addToCart} className="flex-1" />
      </StickyBar>
    </Screen>
  )
}

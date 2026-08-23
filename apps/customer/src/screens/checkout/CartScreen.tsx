import { Image, Pressable, ScrollView, View } from 'react-native'

import { Button, Card, Divider, Eyebrow, H1, Muted, Screen, StickyBar, Text } from '../../components/ui'
import { lineTotal, useCart } from '../../lib/cart'
import { formatINR, splitPriceLabel } from '../../lib/format'
import type { CartStackProps } from '../../navigation/types'

/**
 * Screen 18 — the Cart tab. Line items, itemised bill, sticky total.
 * Browsing lives in the Home tab, so "add another" and "change area" hand
 * over to it; checkout continues in this stack.
 */
export function CartScreen({ navigation }: CartStackProps<'Cart'>) {
  const { lines, remove, setQty, subtotal, visitCharge, total } = useCart()
  // Area-based lines are quoted, not fixed, so the bill is an estimate.
  const hasPerUnit = lines.some((l) => l.priceUnit !== 'fixed')

  const browse = () => navigation.getParent()?.navigate({ name: 'HomeTab', params: { screen: 'Categories' } } as never)

  if (lines.length === 0) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 p-8">
          <H1>Your cart is empty</H1>
          <Muted className="text-center">Add a Deep Cleaning service and it will show up here.</Muted>
          <Button label="Browse Deep Cleaning" onPress={browse} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 32, gap: 16 }}>
        <H1>Your cart</H1>

        <View className="gap-3">
          {lines.map((l) => {
            const price = splitPriceLabel(l.priceLabel)
            const perUnit = l.priceUnit !== 'fixed'
            return (
              <Card key={l.serviceId}>
                <View className="flex-row gap-3">
                  <View className="h-14 w-14 overflow-hidden rounded-md bg-secondary">
                    {l.image ? (
                      <Image
                        source={{ uri: l.image }}
                        className="h-full w-full"
                        resizeMode="cover"
                        accessible
                        accessibilityLabel={l.name}
                      />
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-[15px] leading-5 text-foreground">{l.name}</Text>
                    <Muted className="mt-0.5 text-[12px]">
                      {perUnit ? `${l.units} ${price.unit ?? 'units'} × ${price.amount}` : price.amount}
                    </Muted>
                  </View>
                  <Text className="font-black text-[15px] text-foreground">{formatINR(lineTotal(l))}</Text>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  {/* Quantity only makes sense for a flat-priced service; a
                      per-unit line is changed by editing its area instead. */}
                  {perUnit ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        navigation
                          .getParent()
                          ?.navigate({
                            name: 'HomeTab',
                            params: { screen: 'ServiceDetail', params: { serviceId: l.serviceId } },
                          } as never)
                      }
                      className="min-h-[44px] justify-center"
                    >
                      <Text className="font-bold text-[13px] text-primary">Change area</Text>
                    </Pressable>
                  ) : (
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Decrease quantity of ${l.name}`}
                        onPress={() => setQty(l.serviceId, l.qty - 1)}
                        className="h-11 w-11 items-center justify-center rounded-md border border-border"
                      >
                        <Text className="font-bold text-[16px] text-foreground">−</Text>
                      </Pressable>
                      <Text className="w-6 text-center font-bold text-[15px] text-foreground">{l.qty}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Increase quantity of ${l.name}`}
                        onPress={() => setQty(l.serviceId, l.qty + 1)}
                        className="h-11 w-11 items-center justify-center rounded-md border border-border"
                      >
                        <Text className="font-bold text-[16px] text-foreground">+</Text>
                      </Pressable>
                    </View>
                  )}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${l.name}`}
                    onPress={() => remove(l.serviceId)}
                    className="min-h-[44px] justify-center px-1"
                  >
                    <Text className="font-bold text-[13px] text-destructive">Remove</Text>
                  </Pressable>
                </View>
              </Card>
            )
          })}
        </View>

        <Pressable accessibilityRole="button" onPress={browse} className="min-h-[44px] justify-center">
          <Text className="font-bold text-[14px] text-primary">+ Add another service</Text>
        </Pressable>

        <Card className="gap-2.5">
          <Eyebrow>Bill</Eyebrow>
          <Row label="Services" value={formatINR(subtotal)} />
          {visitCharge > 0 ? <Row label="Visit charge" value={formatINR(visitCharge)} /> : null}
          <Divider className="my-1" />
          <View className="flex-row items-baseline justify-between">
            <Text className="font-bold text-[15px] text-foreground">{hasPerUnit ? 'Estimated total' : 'Total'}</Text>
            <Text className="font-black text-[19px] text-foreground">{formatINR(total)}</Text>
          </View>
          <Muted className="text-[11px]">
            Inclusive of 18% GST. Confirmed from the live price list when you book
            {hasPerUnit ? '; area-based services are measured on site' : ''}.
          </Muted>
        </Card>
      </ScrollView>

      <StickyBar>
        <View>
          <Text className="font-black text-[20px] text-foreground">{formatINR(total)}</Text>
          <Eyebrow>{lines.length} {lines.length === 1 ? 'item' : 'items'}</Eyebrow>
        </View>
        <Button label="Choose a slot" onPress={() => navigation.navigate('SlotPayment')} className="flex-1" />
      </StickyBar>
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Muted>{label}</Muted>
      <Text className="font-medium text-[14px] text-foreground">{value}</Text>
    </View>
  )
}

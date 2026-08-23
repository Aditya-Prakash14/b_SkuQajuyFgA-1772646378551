import { useState } from 'react'
import { Linking, Pressable, View } from 'react-native'

import { Body, Card, Divider, Eyebrow, H1, Muted, Screen, Text } from '../../components/ui'

const SUPPORT_PHONE = '917349603429'
const SUPPORT_EMAIL = 'support@myprimecompany.in'
export const TERMS_URL = 'https://www.myprimecompany.com/terms'
export const PRIVACY_URL = 'https://www.myprimecompany.com/privacy'
export const REFUND_URL = 'https://www.myprimecompany.com/refund-policy'

/**
 * The website's seven homepage questions, with the three answers the site
 * gives inconsistently settled the way the product spec's §11 defaults them:
 * a 48-hour re-clean window, free cancellation until a helper is assigned,
 * and the cities the database actually serves.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is the difference between Deep Cleaning and Prime Now?',
    a: 'Deep Cleaning is booked in advance at a flat price for a defined job — a 2 BHK flat, an office, a marble floor. Prime Now is instant help charged by the hour: you tell us what needs doing and a helper comes over, usually within the hour.',
  },
  {
    q: 'Do I need to provide cleaning supplies?',
    a: 'No. Our professionals bring their own equipment and eco-friendly cleaning products.',
  },
  {
    q: 'How are your professionals verified?',
    a: 'Every professional completes an ID and address check and is trained before taking their first job.',
  },
  {
    q: 'What if I am not satisfied with the work?',
    a: 'Not happy? We will come back and re-clean at no extra cost. Tell us within 48 hours of the visit.',
  },
  {
    q: 'How do I pay?',
    a: 'Pay after the work is done, by cash or UPI. The price you see when booking is the price you pay, inclusive of GST.',
  },
  {
    q: 'Can I reschedule or cancel a booking?',
    a: 'Yes. Change the date or cancel from the booking itself, free of charge, until a helper is assigned. After that, call us and we will sort it out.',
  },
  {
    q: 'Which cities do you serve?',
    a: 'Bangalore today. The address step only offers the cities we currently cover, and more are on the way.',
  },
]

/** The Help tab. Contact first, because a live problem beats an FAQ. */
export function HelpScreen() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Screen>
      <Body>
        <H1>Help</H1>

        <Card className="gap-0">
          <Eyebrow className="mb-2">Talk to us</Eyebrow>
          <Row label="Call us" value="+91 73496 03429" onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)} />
          <Divider />
          <Row label="WhatsApp" value="Chat with us" onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`)} />
          <Divider />
          <Row label="Email" value={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        </Card>

        <View className="gap-3">
          <Eyebrow>Common questions</Eyebrow>
          {FAQS.map((f, i) => {
            const expanded = open === i
            return (
              <Pressable
                key={f.q}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpen(expanded ? null : i)}
              >
                <Card>
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 font-bold text-[14px] leading-5 text-foreground">{f.q}</Text>
                    <Text className="font-bold text-[16px] text-primary">{expanded ? '–' : '+'}</Text>
                  </View>
                  {expanded ? <Muted className="mt-1.5 text-[13px]">{f.a}</Muted> : null}
                </Card>
              </Pressable>
            )
          })}
        </View>

        <Card className="gap-0">
          <Eyebrow className="mb-2">Policies</Eyebrow>
          <Row label="Terms of service" value="Read" onPress={() => Linking.openURL(TERMS_URL)} />
          <Divider />
          <Row label="Privacy policy" value="Read" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Divider />
          <Row label="Refund policy" value="Read" onPress={() => Linking.openURL(REFUND_URL)} />
        </Card>

        <Card className="bg-secondary">
          <Text className="font-bold text-[13px] text-foreground">
            Not happy? We will come back and re-clean at no extra cost.
          </Text>
          <Muted className="mt-1 text-[12px]">
            Verified Professionals · Eco-Friendly Products · On-Time Service
          </Muted>
        </Card>
      </Body>
    </Screen>
  )
}

function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[48px] flex-row items-center justify-between gap-3"
    >
      <Text className="font-medium text-[14px] text-foreground">{label}</Text>
      <Text className="font-medium text-[13px] text-primary">{value}</Text>
    </Pressable>
  )
}

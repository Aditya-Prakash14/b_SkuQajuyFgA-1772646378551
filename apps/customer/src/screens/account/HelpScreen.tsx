import { Linking, Pressable, View } from 'react-native'

import { Body, Card, Divider, Eyebrow, H1, Muted, Screen, Text } from '../../components/ui'

const SUPPORT_PHONE = '917349603429'
const SUPPORT_EMAIL = 'support@myprimecompany.in'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is the difference between Deep Cleaning and Prime Now?',
    a: 'Deep Cleaning is booked in advance at a flat price for a defined job. Prime Now is instant help charged by the hour — you tell us what needs doing and a helper comes over.',
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
    q: 'What if I am not satisfied?',
    a: 'Not happy? We will come back and re-clean at no extra cost. Tell us within 24 hours of the visit.',
  },
  {
    q: 'How do I pay?',
    a: 'Pay after the work is done, by cash or UPI. The price you see when booking is the price you pay.',
  },
]

/** The Help tab. Contact first, because a live problem beats an FAQ. */
export function HelpScreen() {
  return (
    <Screen>
      <Body>
        <H1>Help</H1>

        <Card className="gap-0">
          <Eyebrow className="mb-2">Talk to us</Eyebrow>
          <Row label="Call us" value="+91 73496 03429" onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)} />
          <Divider />
          <Row
            label="WhatsApp"
            value="Chat with us"
            onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`)}
          />
          <Divider />
          <Row label="Email" value={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        </Card>

        <View className="gap-3">
          <Eyebrow>Common questions</Eyebrow>
          {FAQS.map((f) => (
            <Card key={f.q}>
              <Text className="font-bold text-[14px] leading-5 text-foreground">{f.q}</Text>
              <Muted className="mt-1.5 text-[13px]">{f.a}</Muted>
            </Card>
          ))}
        </View>

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

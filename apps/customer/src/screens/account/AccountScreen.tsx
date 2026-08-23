import { useEffect, useState } from 'react'
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native'

import { Button, Card, Divider, Eyebrow, H1, Muted, Screen, Text } from '../../components/ui'
import { fetchNotificationPrefs, saveNotificationPrefs } from '../../lib/bookings'
import { useSession } from '../../lib/session'
import { colors } from '../../lib/theme'
import type { NotificationPrefs } from '../../lib/types'

const SUPPORT_PHONE = '917349603429'
const SUPPORT_EMAIL = 'support@myprimecompany.in'

/** Screen 24. Profile, membership, settings, sign out. */
export function AccountScreen() {
  const { profile, draft, addresses, defaultAddress, signOut } = useSession()
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)

  useEffect(() => {
    fetchNotificationPrefs()
      .then((p) => setPrefs(p ?? { booking_updates: true, helper_en_route: true, marketing: false }))
      .catch(() => {})
  }, [])

  function toggle(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((p) => (p ? { ...p, [key]: value } : p))
    saveNotificationPrefs({ [key]: value }).catch(() => {})
  }

  const name = profile?.name || draft.name || 'Guest'
  const email = profile?.email || draft.email

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40, gap: 16 }}>
        <H1>Account</H1>

        <Card>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-pill bg-secondary">
              <Text className="font-black text-[20px] text-primary">{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-[17px] text-foreground">{name}</Text>
              {profile?.phone ? <Muted className="text-[13px]">{profile.phone}</Muted> : null}
              {email ? <Muted className="text-[13px]">{email}</Muted> : null}
            </View>
          </View>
        </Card>

        {/* Prime Care is listed in §12 of the spec as an open business
            decision, so it is presented as an interest banner rather than
            something a customer can buy today. */}
        <View className="gap-2 rounded-lg bg-ink p-4">
          <Text className="font-mono text-[11px] uppercase text-brand" style={{ letterSpacing: 1.4 }}>
            Prime Care
          </Text>
          <Text className="font-black text-[19px] text-ink-foreground" style={{ letterSpacing: -0.5 }}>
            Membership is coming soon
          </Text>
          <Text className="font-sans text-[13px] leading-5 text-ink-foreground/70">
            Priority slots and a standing discount on every booking. We will let you know when it opens.
          </Text>
        </View>

        <Card className="gap-3">
          <Eyebrow>Addresses</Eyebrow>
          {addresses.length === 0 ? (
            <Muted className="text-[13px]">No address saved yet.</Muted>
          ) : (
            addresses.map((a) => (
              <View key={a.id} className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-bold text-[14px] text-foreground">
                    {a.label ?? 'Address'}
                    {a.id === defaultAddress?.id ? ' · default' : ''}
                  </Text>
                  <Muted className="text-[12px]">
                    {a.full_address}, {a.city}
                  </Muted>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card className="gap-3">
          <Eyebrow>Notifications</Eyebrow>
          {prefs ? (
            (
              [
                ['booking_updates', 'Booking updates'],
                ['helper_en_route', 'Helper on the way'],
                ['marketing', 'Offers and news'],
              ] as const
            ).map(([key, label]) => (
              <View key={key} className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 font-medium text-[14px] text-foreground">{label}</Text>
                <Switch
                  value={prefs[key]}
                  onValueChange={(v) => toggle(key, v)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  accessibilityLabel={label}
                />
              </View>
            ))
          ) : (
            <Muted className="text-[13px]">Loading…</Muted>
          )}
        </Card>

        <Card className="gap-0">
          <Eyebrow className="mb-2">Help</Eyebrow>
          <Row label="Call us" value="+91 73496 03429" onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)} />
          <Divider />
          <Row label="Email" value={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
          <Divider />
          <Row
            label="WhatsApp"
            value="Chat with us"
            onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`)}
          />
        </Card>

        <Card>
          <Eyebrow>Registered office</Eyebrow>
          <Muted className="mt-1.5 text-[13px]">
            HSR Layout Sector 4, 17th Main B Cross{'\n'}Bangalore, Karnataka 560102
          </Muted>
        </Card>

        <Button label="Sign out" variant="outline" onPress={signOut} />

        <View className="items-center pt-2">
          <Eyebrow>Account secured by Supabase Auth</Eyebrow>
        </View>
      </ScrollView>
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

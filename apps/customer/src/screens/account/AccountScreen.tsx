import { useEffect, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, Switch, View } from 'react-native'

import { Button, Card, Divider, Eyebrow, Field, H1, Muted, Screen, Text } from '../../components/ui'
import { useAppearance, type ThemePref } from '../../lib/appearance'
import { fetchNotificationPrefs, saveNotificationPrefs, upsertMyProfile } from '../../lib/bookings'
import { registerForPush } from '../../lib/push'
import { useSession } from '../../lib/session'
import { errorMessage } from '../../lib/supabase'
import { useColors } from '../../lib/theme'
import type { NotificationPrefs } from '../../lib/types'
import type { AccountStackProps } from '../../navigation/types'
import { PRIVACY_URL, TERMS_URL } from './HelpScreen'

const SUPPORT_PHONE = '917349603429'
const SUPPORT_EMAIL = 'support@myprimecompany.in'

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** Screen 24. Profile, membership, addresses, settings, sign out. */
export function AccountScreen({ navigation }: AccountStackProps<'AccountHome'>) {
  const { profile, draft, addresses, defaultAddress, signOut, deleteAccount, refresh } = useSession()
  const { pref, setPref } = useAppearance()
  const colors = useColors()
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  // Two confirmations: the first explains what goes, the second is the
  // irreversible one. Stores require the option; nobody should hit it by
  // accident.
  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'Your profile, addresses and notification settings are removed. Booking records are kept for accounting, without your name or phone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('This cannot be undone', 'Delete the account now?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete account', style: 'destructive', onPress: doDelete },
            ]),
        },
      ],
    )
  }

  async function doDelete() {
    setDeleting(true)
    setAccountError(null)
    try {
      await deleteAccount()
    } catch (err) {
      setAccountError(errorMessage(err, 'Could not delete the account. Please call us and we will do it for you.'))
    } finally {
      setDeleting(false)
    }
  }

  // A Google sign-up has no phone yet, so one is stored as 'pending:<uid>'.
  // That is plumbing, never something to show a customer.
  const displayPhone = profile?.phone && !profile.phone.startsWith('pending:') ? profile.phone : null

  async function saveProfile() {
    if (editName.trim().length < 2) {
      setSaveError('Please enter your name.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await upsertMyProfile({
        name: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone || null,
      })
      await refresh()
      setEditing(false)
    } catch (err) {
      setSaveError(errorMessage(err, 'Could not save your profile.'))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchNotificationPrefs()
      .then((p) => setPrefs(p ?? { booking_updates: true, helper_en_route: true, marketing: false }))
      .catch(() => {})
  }, [])

  function toggle(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((p) => (p ? { ...p, [key]: value } : p))
    saveNotificationPrefs({ [key]: value }).catch(() => {})
    // Turning a booking preference on is the moment to make sure this phone
    // can actually receive it.
    if (value && key !== 'marketing') registerForPush().catch(() => {})
  }

  const name = profile?.name || draft.name || 'Guest'
  const email = profile?.email || draft.email

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40, gap: 16 }}>
        <H1>Account</H1>

        <Card>
          {editing ? (
            <View className="gap-3">
              <Eyebrow>Edit profile</Eyebrow>
              {saveError ? <Muted className="text-destructive">{saveError}</Muted> : null}
              <Field label="Full name" value={editName} onChangeText={setEditName} autoCapitalize="words" />
              <Field
                label="Email"
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label="Mobile number"
                value={editPhone}
                onChangeText={(t) => setEditPhone(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                placeholder="10-digit mobile"
              />
              <View className="flex-row gap-2">
                <Button label="Save" onPress={saveProfile} loading={saving} className="flex-1" />
                <Button
                  label="Cancel"
                  variant="outline"
                  onPress={() => {
                    setEditing(false)
                    setSaveError(null)
                  }}
                  className="flex-1"
                />
              </View>
            </View>
          ) : (
            // Tappable: the profile card is the obvious place to change these
            // details, so it behaves like a control rather than a label.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => {
                setEditName(profile?.name ?? draft.name ?? '')
                setEditEmail(profile?.email ?? draft.email ?? '')
                setEditPhone(displayPhone ?? '')
                setEditing(true)
              }}
              className="flex-row items-center gap-3 active:opacity-80"
            >
              <View className="h-14 w-14 items-center justify-center rounded-pill bg-secondary">
                <Text className="font-black text-[20px] text-primary">{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-[17px] text-foreground">{name}</Text>
                {displayPhone ? <Muted className="text-[13px]">{displayPhone}</Muted> : null}
                {email ? <Muted className="text-[13px]">{email}</Muted> : null}
              </View>
              <Text className="font-bold text-[13px] text-primary">Edit</Text>
            </Pressable>
          )}
        </Card>

        {/* Prime Care is listed in §11 of the product spec as an open business
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

        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Addresses')}>
          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <Eyebrow>Addresses</Eyebrow>
              <Text className="font-bold text-[13px] text-primary">Manage ›</Text>
            </View>
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
        </Pressable>

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

        <Card className="gap-3">
          <Eyebrow>Appearance</Eyebrow>
          <View className="flex-row gap-2">
            {THEME_OPTIONS.map((o) => {
              const on = pref === o.value
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setPref(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Appearance: ${o.label}`}
                  className={[
                    'min-h-[44px] flex-1 items-center justify-center rounded-md border px-3',
                    on ? 'border-ink bg-ink' : 'border-border bg-card',
                  ].join(' ')}
                >
                  <Text className={on ? 'font-bold text-[13px] text-ink-foreground' : 'font-medium text-[13px] text-foreground'}>
                    {o.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Muted className="text-[12px]">
            {pref === 'system' ? 'Following your phone’s setting.' : `Always ${pref}, whatever your phone is set to.`}
          </Muted>
        </Card>

        <Card className="gap-0">
          <Eyebrow className="mb-2">Help</Eyebrow>
          <Row label="Call us" value="+91 73496 03429" onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)} />
          <Divider />
          <Row label="Email" value={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
          <Divider />
          <Row label="WhatsApp" value="Chat with us" onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`)} />
          <Divider />
          <Row label="Terms of service" value="Read" onPress={() => Linking.openURL(TERMS_URL)} />
          <Divider />
          <Row label="Privacy policy" value="Read" onPress={() => Linking.openURL(PRIVACY_URL)} />
        </Card>

        <Card>
          <Eyebrow>Registered office</Eyebrow>
          <Muted className="mt-1.5 text-[13px]">
            HSR Layout Sector 4, 17th Main B Cross{'\n'}Bangalore, Karnataka 560102
          </Muted>
        </Card>

        <Button label="Sign out" variant="outline" onPress={signOut} />

        {accountError ? <Muted className="text-center text-destructive">{accountError}</Muted> : null}
        <Button label="Delete account" variant="ghost" onPress={confirmDelete} loading={deleting} />
        <Muted className="text-center text-[11px]">
          Removes your profile, addresses and settings. Booking records are kept for accounting without your name or phone.
        </Muted>

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

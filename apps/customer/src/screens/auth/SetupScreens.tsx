import { useEffect, useState } from 'react'
import { Pressable, Switch, View } from 'react-native'

import {
  Banner,
  Body,
  Button,
  Card,
  Chip,
  Eyebrow,
  Field,
  H1,
  Muted,
  Screen,
  Text,
} from '../../components/ui'
import { track } from '../../lib/analytics'
import { saveMyAddress, saveNotificationPrefs, upsertMyProfile } from '../../lib/bookings'
import { fetchCities } from '../../lib/catalog'
import { registerForPush } from '../../lib/push'
import { useSession } from '../../lib/session'
import { errorMessage } from '../../lib/supabase'
import { useColors } from '../../lib/theme'
import type { AddressLabel } from '../../lib/types'

/** Back out of a setup step. Step 1 has nowhere to go but out, so it signs out. */
function StepBack({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" className="min-h-[44px] justify-center">
      <Text className="font-bold text-[15px] text-primary">‹ {label}</Text>
    </Pressable>
  )
}

/** Shared 3-step progress bar. */
function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View className="gap-2">
      <Eyebrow>Step {step} of 3</Eyebrow>
      <View className="h-1.5 flex-row gap-1.5">
        {[1, 2, 3].map((n) => (
          <View key={n} className={n <= step ? 'flex-1 rounded-pill bg-primary' : 'flex-1 rounded-pill bg-border'} />
        ))}
      </View>
    </View>
  )
}

/* ── 7 · Complete profile ─────────────────────────────────────────────────── */

export function ProfileSetupScreen() {
  const { session, draft, setDraft, markSetupStep, refresh, signOut } = useSession()
  const [name, setName] = useState(draft.name)
  const [email, setEmail] = useState(draft.email || (session?.user.email ?? ''))
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function next() {
    if (name.trim().length < 2) {
      setError('Please tell us your name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Write the customers row now rather than deferring to the first booking:
      // the address step needs current_customer_id() to resolve, and without a
      // row it is NULL and the insert fails RLS.
      await upsertMyProfile({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.replace(/\D/g, '') || null,
      })
      setDraft({ name: name.trim(), email: email.trim() })
      await refresh()
      markSetupStep('profile')
    } catch (err) {
      setError(errorMessage(err, 'Could not save your details.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Body>
        <StepBack onPress={signOut} label="Sign out" />
        <View className="pt-1 gap-5">
          <Progress step={1} />
          <H1>What should we call you?</H1>
          <Muted>This is the name your helper will ask for at the door.</Muted>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
        <Field
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          hint="Receipts and booking confirmations go here."
        />
        <Field
          label="Mobile number"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile"
          keyboardType="number-pad"
          hint="Your helper calls this number on the day."
        />

        <Button label="Continue" onPress={next} loading={busy} />
      </Body>
    </Screen>
  )
}

/* ── 8 · Add address ──────────────────────────────────────────────────────── */

const LABELS: AddressLabel[] = ['Home', 'Work', 'Other']

export function AddressSetupScreen() {
  const { refresh, markSetupStep, profile, draft, goToStep } = useSession()
  const [label, setLabel] = useState<AddressLabel>('Home')
  const [line, setLine] = useState('')
  const [city, setCity] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCities()
      .then((c) => {
        setCities(c)
        setCity((prev) => prev || c[0] || '')
      })
      .catch(() => {})
  }, [])

  async function save() {
    if (line.trim().length < 6) {
      setError('Please enter the flat, building and street.')
      return
    }
    if (!city) {
      setError('Please pick your city.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Goes through an RPC, not a direct insert: addresses are scoped by
      // customer_id = current_customer_id(), and the client neither knows that
      // id nor should be trusted to supply it.
      await saveMyAddress({
        label,
        fullAddress: line.trim(),
        city,
        isDefault: true,
        name: profile?.name || draft.name || null,
      })
      await refresh()
      markSetupStep('address')
    } catch (err) {
      setError(errorMessage(err, 'Could not save that address.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Body>
        <StepBack onPress={() => goToStep('profile')} />
        <View className="pt-1 gap-5">
          <Progress step={2} />
          <H1>Where should we come?</H1>
          <Muted>We only serve the cities listed here today.</Muted>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <View className="flex-row gap-2">
          {LABELS.map((l) => (
            <Chip key={l} label={l} selected={label === l} onPress={() => setLabel(l)} />
          ))}
        </View>

        <Field
          label="Address"
          value={line}
          onChangeText={setLine}
          placeholder="Flat / house, building, street, landmark"
          multiline
          numberOfLines={3}
          style={{ minHeight: 92, textAlignVertical: 'top' }}
        />

        <View className="gap-1.5">
          <Eyebrow>City</Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {cities.map((c) => (
              <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
            ))}
          </View>
        </View>

        <Button label="Save address" onPress={save} loading={busy} />
      </Body>
    </Screen>
  )
}

/* ── 9 · Notifications ────────────────────────────────────────────────────── */

export function NotificationsSetupScreen() {
  const colors = useColors()
  const { markSetupStep, goToStep } = useSession()
  const [bookingUpdates, setBookingUpdates] = useState(true)
  const [enRoute, setEnRoute] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function allow() {
    setBusy(true)
    try {
      await saveNotificationPrefs({
        booking_updates: bookingUpdates,
        helper_en_route: enRoute,
        marketing,
      })
      // The OS prompt follows this tap; the token lands on the same row.
      if (bookingUpdates || enRoute) await registerForPush()
    } catch {
      // Preferences are not worth blocking entry to the app over; the defaults
      // in the table already match what is shown here.
    } finally {
      setBusy(false)
      finish()
    }
  }

  function finish() {
    track('setup_complete')
    markSetupStep('done')
  }

  const rows: { label: string; blurb: string; value: boolean; set: (v: boolean) => void }[] = [
    {
      label: 'Booking updates',
      blurb: 'Confirmations, reschedules and cancellations.',
      value: bookingUpdates,
      set: setBookingUpdates,
    },
    {
      label: 'Helper on the way',
      blurb: 'A nudge when your helper sets out.',
      value: enRoute,
      set: setEnRoute,
    },
    {
      label: 'Offers and news',
      blurb: 'Occasional discounts. Off by default.',
      value: marketing,
      set: setMarketing,
    },
  ]

  return (
    <Screen>
      <Body>
        <StepBack onPress={() => goToStep('address')} />
        <View className="pt-1 gap-5">
          <Progress step={3} />
          <H1>Stay in the loop</H1>
          <Muted>You can change any of this later from your account.</Muted>
        </View>

        <View className="gap-3">
          {rows.map((r) => (
            <Card key={r.label}>
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text className="font-bold text-[15px] text-foreground">{r.label}</Text>
                  <Muted className="text-[12px]">{r.blurb}</Muted>
                </View>
                <Switch
                  value={r.value}
                  onValueChange={r.set}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  accessibilityLabel={r.label}
                />
              </View>
            </Card>
          ))}
        </View>

        <Button label="Allow notifications" onPress={allow} loading={busy} />
        <Button label="Not now" variant="ghost" onPress={finish} />
      </Body>
    </Screen>
  )
}

import { useEffect, useState } from 'react'
import { Switch, View } from 'react-native'

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
import { saveNotificationPrefs } from '../../lib/bookings'
import { fetchCities } from '../../lib/catalog'
import { useSession } from '../../lib/session'
import { errorMessage, supabase } from '../../lib/supabase'
import { colors } from '../../lib/theme'
import type { AddressLabel } from '../../lib/types'

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
  const { session, draft, setDraft, markSetupStep } = useSession()
  const [name, setName] = useState(draft.name)
  const [email, setEmail] = useState(draft.email || (session?.user.email ?? ''))
  const [error, setError] = useState<string | null>(null)

  function next() {
    if (name.trim().length < 2) {
      setError('Please tell us your name.')
      return
    }
    // Held locally: a customers row is only created on the first booking, so
    // there is nothing to write to yet.
    setDraft({ name: name.trim(), email: email.trim() })
    markSetupStep('profile')
  }

  return (
    <Screen>
      <Body>
        <View className="pt-4 gap-5">
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

        <Button label="Continue" onPress={next} />
      </Body>
    </Screen>
  )
}

/* ── 8 · Add address ──────────────────────────────────────────────────────── */

const LABELS: AddressLabel[] = ['Home', 'Work', 'Other']

export function AddressSetupScreen() {
  const { refresh, markSetupStep } = useSession()
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
      // First address becomes the default; a partial unique index keeps only
      // one default per customer, so this is safe to set unconditionally here.
      const { error: insErr } = await supabase
        .from('addresses')
        .insert({ label, full_address: line.trim(), city, is_default: true })
      if (insErr) throw insErr
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
        <View className="pt-4 gap-5">
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
  const { markSetupStep } = useSession()
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
    } catch {
      // Preferences are not worth blocking entry to the app over; the defaults
      // in the table already match what is shown here.
    } finally {
      setBusy(false)
      markSetupStep('done')
    }
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
        <View className="pt-4 gap-5">
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
        <Button label="Not now" variant="ghost" onPress={() => markSetupStep('done')} />
      </Body>
    </Screen>
  )
}

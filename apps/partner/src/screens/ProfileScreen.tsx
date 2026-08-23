import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { Banner, Button, Card, Chip, Field, Label, Loading, Screen, Steps, Text } from '../components/ui'
import { errorMessage, supabase } from '../lib/supabase'
import { space } from '../lib/theme'
import type { Service, Vendor } from '../lib/types'

/**
 * Step 1 — what the partner offers. upsert_my_vendor_profile() advances
 * onboarding_step 'profile' → 'documents' as a side effect, so a successful
 * save is what moves the wizard forward.
 *
 * The two work types are the coarse question — which business the partner is in
 * at all. Dispatch honours them: a Deep-Cleaning-only partner is never woken up
 * for 30 minutes of dishes, and a Prime-Now-only partner never sees a 4 BHK job.
 */
export function ProfileScreen({
  vendor,
  onSaved,
  mode = 'onboarding',
  onCancel,
}: {
  vendor: Vendor
  onSaved: () => void
  /** 'edit' reuses the form from the Account tab: no wizard header, "Save changes". */
  mode?: 'onboarding' | 'edit'
  onCancel?: () => void
}) {
  const [services, setServices] = useState<Service[] | null>(null)
  const [selected, setSelected] = useState<string[]>(vendor.services_offered ?? [])
  const [deepClean, setDeepClean] = useState(vendor.accepts_deep_clean)
  const [primeNow, setPrimeNow] = useState(vendor.accepts_prime_now)
  const [note, setNote] = useState(vendor.application_note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('services')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(errorMessage(error, 'Could not load the service list.'))
        setServices((data as Service[]) ?? [])
      })
  }, [])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function save() {
    if (!deepClean && !primeNow) {
      setError('Choose at least one kind of work.')
      return
    }
    // Services only describe Deep Cleaning, so only require them for it.
    if (deepClean && selected.length === 0) {
      setError('Pick at least one Deep Cleaning service you can take jobs for.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.rpc('upsert_my_vendor_profile', {
        p_name: vendor.name,
        p_email: vendor.email ?? '',
        p_city: vendor.city ?? '',
        p_services: selected,
        p_note: note.trim() || undefined,
        p_accepts_deep_clean: deepClean,
        p_accepts_prime_now: primeNow,
      })
      if (error) throw error
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!services) return <Loading label="Loading services…" />

  return (
    <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(12) }}>
      {mode === 'onboarding' ? <Steps current={1} labels={['Account', 'Profile', 'Documents', 'Review']} /> : null}
      <View style={{ height: space(6) }} />
      <Screen
        title="What work do you want?"
        subtitle="Pick the kind of jobs you want offered to you. You can change this any time from your profile."
      >
        {error ? <Banner tone="error">{error}</Banner> : null}

        <Card>
          <Label>Kind of work</Label>
          <View style={{ gap: space(2) }}>
            <WorkType
              title="Deep Cleaning"
              body="Scheduled, flat-priced jobs — homes, offices, floors, painting. Planned in advance."
              selected={deepClean}
              onPress={() => {
                setDeepClean((v) => !v)
                setError(null)
              }}
            />
            <WorkType
              title="Prime Now"
              body="Instant hourly house help, dispatched to you while you're online. Usually within the hour."
              selected={primeNow}
              onPress={() => {
                setPrimeNow((v) => !v)
                setError(null)
              }}
            />
          </View>
        </Card>

        {deepClean ? (
          <Card>
            <Label>Deep Cleaning services</Label>
            <Text className="mb-2 text-xs text-muted-foreground">
              Only these are offered to you.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
              {services.map((sv) => (
                <Chip key={sv.id} label={sv.name} selected={selected.includes(sv.id)} onPress={() => toggle(sv.id)} />
              ))}
            </View>
          </Card>
        ) : null}

        <Card>
          <Field
            label="Experience & team (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Deep cleaning and sofa shampooing, 4 years experience, team of 6, own equipment"
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          <Button label={mode === 'edit' ? 'Save changes' : 'Save and continue'} onPress={save} loading={busy} />
          {mode === 'edit' && onCancel ? <Button label="Cancel" variant="ghost" onPress={onCancel} /> : null}
        </Card>
      </Screen>
    </ScrollView>
  )
}

function WorkType({
  title,
  body,
  selected,
  onPress,
}: {
  title: string
  body: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      className={
        selected
          ? 'flex-row items-start gap-3 rounded-lg border-2 border-primary bg-secondary p-4 active:opacity-80'
          : 'flex-row items-start gap-3 rounded-lg border-2 border-input bg-card p-4 active:opacity-80'
      }
    >
      <View
        className={
          selected
            ? 'h-6 w-6 items-center justify-center rounded-md border-2 border-primary bg-primary'
            : 'h-6 w-6 items-center justify-center rounded-md border-2 border-input bg-background'
        }
      >
        {selected ? <Text className="text-sm font-bold text-primary-foreground">✓</Text> : null}
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">{body}</Text>
      </View>
    </Pressable>
  )
}

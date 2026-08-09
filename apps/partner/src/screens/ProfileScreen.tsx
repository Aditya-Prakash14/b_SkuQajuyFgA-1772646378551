import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { Banner, Button, Card, Chip, Field, Label, Loading, Screen, Steps } from '../components/ui'
import { errorMessage, supabase } from '../lib/supabase'
import { space } from '../lib/theme'
import type { Service, Vendor } from '../lib/types'

/**
 * Step 1 — what the partner offers. upsert_my_vendor_profile() advances
 * onboarding_step 'profile' → 'documents' as a side effect, so a successful
 * save is what moves the wizard forward.
 */
export function ProfileScreen({ vendor, onSaved }: { vendor: Vendor; onSaved: () => void }) {
  const [services, setServices] = useState<Service[] | null>(null)
  const [selected, setSelected] = useState<string[]>(vendor.services_offered ?? [])
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
    if (selected.length === 0) {
      setError('Pick at least one service you can take jobs for.')
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
      <Steps current={1} labels={['Account', 'Profile', 'Documents', 'Review']} />
      <View style={{ height: space(6) }} />
      <Screen
        title="What do you offer?"
        subtitle="Pick every service you can take jobs for. You can change this later from your profile."
      >
        {error ? <Banner tone="error">{error}</Banner> : null}

        <Card>
          <Label>Services</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {services.map((sv) => (
              <Chip key={sv.id} label={sv.name} selected={selected.includes(sv.id)} onPress={() => toggle(sv.id)} />
            ))}
          </View>

          <Field
            label="Experience & team (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Deep cleaning and sofa shampooing, 4 years experience, team of 6, own equipment"
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          <Button label="Save and continue" onPress={save} loading={busy} />
        </Card>
      </Screen>
    </ScrollView>
  )
}

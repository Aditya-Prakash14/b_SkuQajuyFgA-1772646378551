import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { Banner, Button, Card, Chip, Field, Label, Screen, Steps } from '../components/ui'
import { errorMessage, supabase } from '../lib/supabase'
import { space } from '../lib/theme'

/**
 * Links this signed-in account to a vendor row via claim_vendor().
 *
 * The phone number is the identity key. If the partner already applied through
 * the website ("Become a Partner" → submit_vendor_application), claim_vendor()
 * finds that unclaimed row by phone and adopts it, so their application history
 * carries over instead of creating a duplicate.
 */
export function ClaimScreen({ email, onClaimed }: { email: string; onClaimed: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('cities')
      .select('name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setCities((data ?? []).map((c: { name: string }) => c.name)))
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    // Same rule as the website's partner form: Indian mobile numbers start 6-9.
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'Enter a valid 10-digit mobile number'
    if (!city) e.city = 'Please select a city'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit() {
    if (!validate()) return
    setBusy(true)
    setApiError(null)
    try {
      const { error } = await supabase.rpc('claim_vendor', {
        p_name: name.trim(),
        p_phone: phone,
        p_email: email,
        p_city: city,
      })
      if (error) throw error
      onClaimed()
    } catch (err) {
      // claim_vendor() raises a readable message when the number already
      // belongs to another partner account.
      setApiError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(12) }}>
      <Steps current={0} labels={['Account', 'Profile', 'Documents', 'Review']} />
      <View style={{ height: space(6) }} />
      <Screen title="Your details" subtitle="This is how customers and our ops team will identify you.">
        {apiError ? <Banner tone="error">{apiError}</Banner> : null}

        <Card>
          <Field
            label="Full name / Company"
            value={name}
            onChangeText={setName}
            placeholder="Your name or company"
            error={errors.name}
          />
          <Field
            label="Mobile number"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
            placeholder="10-digit mobile"
            keyboardType="number-pad"
            maxLength={10}
            error={errors.phone}
            hint="If you already applied on our website, use the same number to keep your application."
          />

          <View style={{ gap: space(2) }}>
            <Label>City</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
              {cities.map((c) => (
                <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
              ))}
            </View>
            {errors.city ? <Banner tone="error">{errors.city}</Banner> : null}
          </View>

          <Button label="Continue" onPress={submit} loading={busy} />
        </Card>
      </Screen>
    </ScrollView>
  )
}

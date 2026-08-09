import { ScrollView, Text, View } from 'react-native'

import { Banner, Button, Card, Screen, Steps } from '../components/ui'
import { colors, space } from '../lib/theme'
import type { Vendor } from '../lib/types'

/**
 * Terminal screen once the application is in with our ops team. Also the
 * recovery point for a rejection — status 'rejected' sends the partner back to
 * the document step, which submit_vendor_for_review() explicitly allows to be
 * re-run (it accepts status in ('pending','rejected')).
 */
export function StatusScreen({
  vendor,
  onFixDocuments,
  onSignOut,
}: {
  vendor: Vendor
  onFixDocuments: () => void
  onSignOut: () => void
}) {
  const live = vendor.status === 'active' || vendor.status === 'approved'
  const rejected = vendor.status === 'rejected'

  return (
    <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(12) }}>
      <Steps current={3} labels={['Account', 'Profile', 'Documents', 'Review']} />
      <View style={{ height: space(6) }} />

      <Screen
        title={live ? "You're approved" : rejected ? 'Action needed' : 'Under review'}
        subtitle={
          live
            ? 'Your partner account is active. Our ops team will start assigning jobs in your city.'
            : rejected
              ? 'Our onboarding team could not verify your application as submitted.'
              : 'Thanks — your application is with our onboarding team.'
        }
      >
        {live ? (
          <Banner tone="success">
            Welcome aboard, {vendor.name}. Keep your phone reachable on {vendor.phone} — jobs are
            confirmed by call.
          </Banner>
        ) : rejected ? (
          <Banner tone="error">
            {vendor.rejection_reason ?? 'Please review your documents and submit again.'}
          </Banner>
        ) : (
          <Banner tone="info">
            Verification usually takes 2–3 working days. We will call you on {vendor.phone} once a
            decision is made.
          </Banner>
        )}

        <Card>
          <Row label="Partner" value={vendor.name} />
          <Row label="Mobile" value={vendor.phone} />
          {vendor.city ? <Row label="City" value={vendor.city} /> : null}
          <Row label="Status" value={vendor.status} />
          {vendor.submitted_at ? (
            <Row label="Submitted" value={new Date(vendor.submitted_at).toLocaleDateString('en-IN')} />
          ) : null}
        </Card>

        {rejected ? <Button label="Update documents and resubmit" onPress={onFixDocuments} variant="brand" /> : null}
        <Button label="Sign out" onPress={onSignOut} variant="ghost" />
      </Screen>
    </ScrollView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600', textTransform: 'capitalize' }}>{value}</Text>
    </View>
  )
}

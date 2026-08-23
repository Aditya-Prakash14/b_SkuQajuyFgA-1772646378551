import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { Badge, Button, Card, Text } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import type { Service, Vendor, VendorStats } from '../../lib/types'

/** Profile summary, customer rating, and the two things a working partner needs: edit profile, sign out. */
export function AccountScreen({
  vendor,
  stats,
  onEdit,
  onSignOut,
}: {
  vendor: Vendor
  stats: VendorStats | null
  onEdit: () => void
  onSignOut: () => void
}) {
  const [services, setServices] = useState<Service[] | null>(null)

  useEffect(() => {
    const ids = vendor.services_offered ?? []
    if (ids.length === 0) {
      setServices([])
      return
    }
    supabase
      .from('services')
      .select('id, name')
      .in('id', ids)
      .order('name')
      .then(({ data }) => setServices((data as Service[] | null) ?? []))
  }, [vendor.services_offered])

  const statusTone = vendor.status === 'active' ? 'success' : vendor.status === 'approved' ? 'default' : 'warning'
  const statusLabel =
    vendor.status === 'active' ? 'Active' : vendor.status === 'approved' ? 'Approved · awaiting activation' : vendor.status

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}>
      <Text className="text-2xl font-bold text-foreground">Account</Text>

      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">{vendor.name}</Text>
            <Text className="mt-0.5 text-sm text-muted-foreground">{vendor.phone}</Text>
            {vendor.email ? <Text className="text-sm text-muted-foreground">{vendor.email}</Text> : null}
            {vendor.city ? <Text className="mt-1 text-sm text-foreground">{vendor.city}</Text> : null}
          </View>
          <Badge variant={statusTone}>
            <Text>{statusLabel}</Text>
          </Badge>
        </View>
        {vendor.status === 'approved' ? (
          <Text className="mt-3 text-xs leading-4 text-muted-foreground">
            Ops activates your account after a final check; jobs are assigned only to active partners.
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Work you accept</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {vendor.accepts_deep_clean ? (
            <Badge variant="default">
              <Text>Deep Cleaning</Text>
            </Badge>
          ) : null}
          {vendor.accepts_prime_now ? (
            <Badge variant="brand">
              <Text>Prime Now</Text>
            </Badge>
          ) : null}
          {!vendor.accepts_deep_clean && !vendor.accepts_prime_now ? (
            <Text className="text-sm text-muted-foreground">None selected — edit your profile.</Text>
          ) : null}
        </View>
      </Card>

      <Card>
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Customer rating</Text>
        {stats && stats.rating_count > 0 && stats.rating_avg !== null ? (
          <View className="mt-2 flex-row items-baseline gap-2">
            <Text className="text-3xl font-bold text-foreground">
              {'★'} {stats.rating_avg.toFixed(1)}
            </Text>
            <Text className="text-sm text-muted-foreground">
              from {stats.rating_count} review{stats.rating_count === 1 ? '' : 's'}
            </Text>
          </View>
        ) : (
          <Text className="mt-2 text-sm text-muted-foreground">
            No ratings yet — customers are asked to rate each completed job.
          </Text>
        )}
      </Card>

      {vendor.accepts_deep_clean ? (
      <Card>
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Deep Cleaning services
        </Text>
        {services === null ? (
          <Text className="mt-2 text-sm text-muted-foreground">Loading…</Text>
        ) : services.length === 0 ? (
          <Text className="mt-2 text-sm text-muted-foreground">
            None selected yet — add some so ops can match you to jobs.
          </Text>
        ) : (
          <View className="mt-2 flex-row flex-wrap gap-2">
            {services.map((s) => (
              <Badge key={s.id} variant="secondary">
                <Text>{s.name}</Text>
              </Badge>
            ))}
          </View>
        )}
      </Card>
      ) : null}

      <Card>
        <Button label="Edit profile" variant="ghost" onPress={onEdit} />
      </Card>

      <Button label="Sign out" variant="ghost" onPress={onSignOut} />
    </ScrollView>
  )
}

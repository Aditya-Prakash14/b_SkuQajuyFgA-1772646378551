import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { Badge, Button, Card, Text } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import type { Service, Vendor } from '../../lib/types'

/** Profile summary + the two things a working partner needs: edit profile, sign out. */
export function AccountScreen({
  vendor,
  onEdit,
  onSignOut,
}: {
  vendor: Vendor
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
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Services you offer</Text>
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
        <View className="mt-3">
          <Button label="Edit profile" variant="ghost" onPress={onEdit} />
        </View>
      </Card>

      <Button label="Sign out" variant="ghost" onPress={onSignOut} />
    </ScrollView>
  )
}

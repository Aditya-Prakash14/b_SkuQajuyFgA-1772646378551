import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Button, H1, Loading, Muted, Screen } from '../../components/ui'
import { fetchBookings } from '../../lib/bookings'
import type { BookingsStackParams } from '../../navigation/types'

/**
 * The landing route for a link: myprimecompany://booking/<kind>/<id>, the
 * website's /account/bookings/<id>, or a push notification. Tracking needs
 * the whole booking, so this loads the list, finds the one, and swaps itself
 * for the tracking screen.
 */
export function OpenBookingScreen({
  route,
  navigation,
}: NativeStackScreenProps<BookingsStackParams, 'OpenBooking' | 'OpenOrder'>) {
  const kind = route.params?.kind === 'now' ? 'now' : 'deep'
  const id = route.params?.id
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true
    if (!id) {
      setMissing(true)
      return
    }
    fetchBookings()
      .then((all) => {
        if (!alive) return
        const booking = all.find((b) => b.id === id && b.kind === kind)
        if (booking) navigation.replace('Tracking', { booking })
        else setMissing(true)
      })
      .catch(() => {
        if (alive) setMissing(true)
      })
    return () => {
      alive = false
    }
  }, [id, kind, navigation])

  if (!missing) return <Loading label="Opening your booking…" />

  return (
    <Screen edges={[]}>
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <H1>Booking not found</H1>
        <Muted className="text-center">
          It may belong to another account. Sign in with the account that made it, or find it in your bookings.
        </Muted>
        <Button label="My bookings" onPress={() => navigation.replace('MyBookings')} />
      </View>
    </Screen>
  )
}

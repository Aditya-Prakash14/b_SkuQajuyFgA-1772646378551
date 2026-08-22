import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Badge, Button, Card, Text } from '../../components/ui'
import { acceptOffer, declineOffer, formatINR, secondsLeft } from '../../lib/jobs'
import { errorMessage } from '../../lib/supabase'
import type { Offer } from '../../lib/types'

/**
 * New work offered to this partner, first-accept-wins.
 *
 * Sits above the job list because it is time-boxed: an offer expires in about
 * two minutes and then goes to the next partner. The countdown is local — the
 * server is the authority and re-checks expiry on accept.
 */
export function OffersBanner({
  offers,
  onResponded,
}: {
  offers: Offer[]
  onResponded: () => Promise<void> | void
}) {
  const [now, setNow] = useState(Date.now())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // One timer for the whole list rather than one per card.
  useEffect(() => {
    if (offers.length === 0) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [offers.length])

  const live = offers.filter((o) => secondsLeft(o.expires_at, now) > 0)
  if (live.length === 0) return null

  async function respond(offer: Offer, take: boolean) {
    setBusyId(offer.offer_id)
    setError(null)
    try {
      if (take) await acceptOffer(offer.offer_id)
      else await declineOffer(offer.offer_id)
      await onResponded()
    } catch (err) {
      // "Another partner took this job" is normal, not a failure.
      setError(errorMessage(err, 'Could not respond to that offer.'))
      await onResponded()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          New work for you
        </Text>
        <Badge variant="brand">
          <Text>{live.length}</Text>
        </Badge>
      </View>

      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}

      {live.map((o) => {
        const left = secondsLeft(o.expires_at, now)
        const busy = busyId === o.offer_id
        return (
          <Card key={o.offer_id} className="border-brand">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[15px] font-bold leading-5 text-foreground">
                  {o.summary ?? 'Job'}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">{o.reference}</Text>
              </View>
              <Badge variant={left <= 30 ? 'destructive' : 'brand'}>
                <Text>{left}s</Text>
              </Badge>
            </View>

            <Text className="mt-2 text-sm font-medium text-foreground">{o.scheduled_label}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
              {o.address ?? o.city ?? 'Address shared once you accept'}
            </Text>
            {o.notes ? (
              <Text className="mt-1 text-xs italic text-muted-foreground" numberOfLines={2}>
                “{o.notes}”
              </Text>
            ) : null}

            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">{formatINR(o.total)}</Text>
              <View className="flex-row gap-2">
                <Button label="Pass" variant="ghost" onPress={() => respond(o, false)} disabled={busy} />
                <Button label="Accept" variant="brand" onPress={() => respond(o, true)} loading={busy} />
              </View>
            </View>
          </Card>
        )
      })}
    </View>
  )
}

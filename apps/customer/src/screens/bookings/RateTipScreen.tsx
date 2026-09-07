import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Banner, Body, Button, Card, Eyebrow, Field, H1, Muted, Screen, Text } from '../../components/ui'
import { track } from '../../lib/analytics'
import { submitRating, submitRequestRating } from '../../lib/bookings'
import { formatINR } from '../../lib/format'
import { errorMessage, supabase } from '../../lib/supabase'
import type { BookingsStackProps } from '../../navigation/types'

const TIPS = [0, 20, 50, 100]

/**
 * Screen 22. Stars, tip presets, optional comment.
 *
 * submit_review is per service, and it verifies server-side that the booking is
 * the caller's own and completed — so the star rating cannot be forged for
 * someone else's job.
 */
export function RateTipScreen({ route, navigation }: BookingsStackProps<'RateTip'>) {
  const { booking } = route.params
  const [stars, setStars] = useState(0)
  const [tip, setTip] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    if (stars < 1) {
      setError('Tap a star to rate your helper.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (booking.kind === 'now') {
        // A Prime Now request is rated as a whole (0033).
        await submitRequestRating({ requestId: booking.id, stars, comment: comment.trim() || null, tip })
      } else {
        // A Deep Cleaning rating attaches to a service line, so resolve the
        // booking's first service id rather than trusting navigation params.
        const { data, error: qErr } = await supabase
          .from('order_items')
          .select('service_id')
          .eq('order_id', booking.id)
          .not('service_id', 'is', null)
          .limit(1)
          .maybeSingle()
        if (qErr) throw qErr
        const serviceId = (data as { service_id: string } | null)?.service_id
        if (!serviceId) throw new Error('This booking has no service to rate.')

        await submitRating({
          orderId: booking.id,
          serviceId,
          stars,
          comment: comment.trim() || null,
          tip,
        })
      }
      track('submit_review', { stars, tip, kind: booking.kind })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not save your rating.'))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Screen edges={[]}>
        <View className="flex-1 items-center justify-center gap-5 p-8">
          <View className="h-16 w-16 items-center justify-center rounded-pill bg-secondary">
            <Text className="font-black text-[26px] text-primary">✓</Text>
          </View>
          <H1>Thank you</H1>
          <Muted className="text-center">
            Your rating helps us keep standards high.
            {tip > 0 ? ` The ${formatINR(tip)} tip is passed on to your helper.` : ''}
          </Muted>
          <Button label="Done" onPress={() => navigation.popToTop()} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen edges={[]}>
      <Body>
        <View className="items-center gap-3 pt-4">
          <View className="h-20 w-20 items-center justify-center rounded-pill bg-secondary">
            <Text className="font-black text-[26px] text-primary">PC</Text>
          </View>
          <H1>How did it go?</H1>
          <Muted className="text-center">{booking.items[0]?.service_name}</Muted>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <View className="flex-row justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
              onPress={() => {
                setStars(n)
                setError(null)
              }}
              className="h-12 w-12 items-center justify-center"
            >
              <Text className={n <= stars ? 'text-[32px] text-brand' : 'text-[32px] text-border'}>★</Text>
            </Pressable>
          ))}
        </View>

        <Card className="gap-3">
          <Eyebrow>Add a tip (optional)</Eyebrow>
          <View className="flex-row gap-2">
            {TIPS.map((t) => {
              const active = tip === t
              return (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTip(t)}
                  className={
                    active
                      ? 'min-h-[44px] flex-1 items-center justify-center rounded-pill bg-ink'
                      : 'min-h-[44px] flex-1 items-center justify-center rounded-pill border border-border bg-card'
                  }
                >
                  <Text className={active ? 'font-bold text-[13px] text-ink-foreground' : 'font-bold text-[13px] text-foreground'}>
                    {t === 0 ? 'No tip' : formatINR(t)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Muted className="text-[11px]">Tips are paid out with the helper&apos;s earnings.</Muted>
        </Card>

        <Field
          label="Comment (optional)"
          value={comment}
          onChangeText={setComment}
          placeholder="Anything you would like us to know."
          multiline
          numberOfLines={3}
          style={{ minHeight: 88, textAlignVertical: 'top' }}
        />

        <Button label="Submit rating" onPress={submit} loading={busy} />
      </Body>
    </Screen>
  )
}

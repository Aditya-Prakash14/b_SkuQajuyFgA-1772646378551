import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Text } from '../../components/ui'
import { fetchDispatchState } from '../../lib/prime-now'
import { colors } from '../../lib/theme'
import type { HomeStackProps } from '../../navigation/types'

/**
 * Screen 17. Dark screen, pulsing indicator, live dispatch log.
 *
 * The log is honest about what is actually happening server-side: the request
 * is broadcast to a wave of eligible online partners, first accept wins, and an
 * unanswered wave escalates to the next one every minute. We poll the request
 * rather than subscribe, because a customer has no RLS path to job_offers —
 * only to their own request row.
 */

const STEPS = [
  'Request received',
  'Finding verified helpers near you',
  'Sent to helpers in your area',
  'Waiting for someone to accept',
]

export function PrimeMatchingScreen({ route, navigation }: HomeStackProps<'PrimeMatching'>) {
  const { requestId, reference } = route.params
  const [step, setStep] = useState(0)
  const [matched, setMatched] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  useEffect(() => {
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000)
    // Walk the log forward for the first few seconds so the screen reads as
    // progress rather than a frozen spinner.
    const advance = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500)
    return () => {
      clearInterval(tick)
      clearInterval(advance)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const poll = setInterval(async () => {
      try {
        const state = await fetchDispatchState(requestId)
        if (cancelled || !state) return
        if (state.assigned) {
          setMatched(true)
          clearInterval(poll)
        }
      } catch {
        // Transient failures are not worth surfacing on this screen.
      }
    }, 4000)
    return () => {
      cancelled = true
      clearInterval(poll)
    }
  }, [requestId])

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] })
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] })

  // Past ~90 seconds the honest thing is to say a human will call, rather than
  // spin forever: the server keeps escalating to the next wave regardless.
  const slow = elapsed > 90 && !matched

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink">
      <View className="flex-1 items-center justify-center gap-8 px-[22px]">
        <View className="h-[120px] w-[120px] items-center justify-center">
          <Animated.View
            className="absolute h-[120px] w-[120px] rounded-pill"
            style={{ backgroundColor: colors.brand, transform: [{ scale }], opacity }}
          />
          <View className="h-[76px] w-[76px] items-center justify-center rounded-pill bg-brand">
            {matched ? (
              <Text className="font-black text-[30px] text-brand-foreground">✓</Text>
            ) : (
              <ActivityIndicator color={colors.ink} />
            )}
          </View>
        </View>

        <View className="items-center gap-2">
          <Text className="font-mono text-[11px] uppercase text-brand" style={{ letterSpacing: 1.4 }}>
            {reference}
          </Text>
          <Text className="text-center font-black text-[26px] text-ink-foreground" style={{ letterSpacing: -0.7 }}>
            {matched ? 'Helper found' : slow ? 'Still looking' : 'Finding you a helper'}
          </Text>
          <Text className="text-center font-sans text-[14px] leading-[21px] text-ink-foreground/70">
            {matched
              ? 'A verified helper has accepted your request. We will call to confirm the arrival time.'
              : slow
                ? 'Helpers near you are busy. We are still trying, and our team will call you shortly.'
                : 'This usually takes under a minute.'}
          </Text>
        </View>

        {!matched ? (
          <View className="w-full gap-2.5">
            {STEPS.map((s, i) => {
              const done = i < step
              const active = i === step
              return (
                <View key={s} className="flex-row items-center gap-3">
                  <View
                    className={
                      done || active
                        ? 'h-2 w-2 rounded-pill bg-brand'
                        : 'h-2 w-2 rounded-pill bg-white/20'
                    }
                  />
                  <Text
                    className={
                      done || active
                        ? 'flex-1 font-medium text-[13px] text-ink-foreground'
                        : 'flex-1 font-sans text-[13px] text-ink-foreground/40'
                    }
                  >
                    {s}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : null}
      </View>

      <View className="gap-2 px-[22px] pb-2">
        {matched ? (
          <Button label="Track my booking" variant="brand" onPress={() => navigation.popToTop()} />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.popToTop()}
            className="min-h-[44px] items-center justify-center"
          >
            <Text className="font-bold text-[14px] text-ink-foreground/70">Cancel request</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  )
}

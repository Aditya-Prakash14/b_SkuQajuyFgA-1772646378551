import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Text } from '../../components/ui'
import { useColors } from '../../lib/theme'

/**
 * Screen 1. Shown while fonts and the stored session load — a real wait, not a
 * timed delay, so the app never sits here longer than it has to.
 */
export function SplashScreen() {
  const colors = useColors()
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null
    // A looping bar is exactly what "reduce motion" asks us not to do.
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce) {
          progress.setValue(1)
          return
        }
        loop = Animated.loop(
          Animated.timing(progress, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        )
        loop.start()
      })
    return () => loop?.stop()
  }, [progress])

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['12%', '100%'] })

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: colors.deep }}>
      <View className="flex-1 items-center justify-center gap-6">
        <View className="h-24 w-24 items-center justify-center rounded-lg bg-white p-4">
          <Image
            source={require('../../../assets/logo.png')}
            resizeMode="contain"
            className="h-full w-full"
            accessibilityLabel="MyPrimeCompany"
          />
        </View>
        <Text className="font-black text-[22px] text-white" style={{ letterSpacing: -0.6 }}>
          MyPrimeCompany
        </Text>
      </View>

      <View className="gap-4 px-10 pb-10">
        <View className="h-1 overflow-hidden rounded-pill bg-white/20">
          <Animated.View className="h-full rounded-pill bg-white" style={{ width }} />
        </View>
        <Text className="text-center font-mono text-[11px] uppercase text-white/70" style={{ letterSpacing: 1.4 }}>
          Trusted by 1 million+ customers
        </Text>
      </View>
    </SafeAreaView>
  )
}

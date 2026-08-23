import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Dots, Eyebrow, H1, Muted, Text } from '../../components/ui'
import { colors } from '../../lib/theme'

/**
 * Screens 2–4: the two domains, then the trust close.
 *
 * One component with three slides rather than three screens — the pager, the
 * Skip target and the next button are identical, and the only real difference
 * is a light or dark treatment, which is exactly what the spec is describing.
 */

interface Slide {
  eyebrow: string
  title: string
  body: string
  image: ReturnType<typeof require> | null
  dark: boolean
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Domain 01',
    title: 'Deep cleaning, booked in advance',
    body: 'Homes, offices, marble floors and painting. A flat price agreed up front and a supervisor-led team at your door.',
    image: null,
    dark: false,
  },
  {
    eyebrow: 'Domain 02',
    title: 'Prime Now — help within the hour',
    body: 'Instant house help by the hour. Tell us what needs doing and a verified helper is on the way. No catalogue to search.',
    image: null,
    dark: true,
  },
  {
    eyebrow: 'Verified people',
    title: 'Every helper is checked and rated',
    body: 'ID-verified, trained, and rated after every job. Not happy? We will come back and re-clean at no extra cost.',
    image: null,
    dark: false,
  },
]

export function IntroScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const last = index === SLIDES.length - 1

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className={slide.dark ? 'flex-1 bg-ink' : 'flex-1 bg-background'}
    >
      <View className="flex-1 px-[22px] pt-2">
        <View className="h-11 flex-row items-center justify-between">
          {/* Back is available from slide 2 onward — the spec's pager has no
              way back otherwise, which reads as a dead end. */}
          {index > 0 ? (
            <Pressable
              onPress={() => setIndex((i) => i - 1)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="px-2 py-2"
            >
              <Text className={slide.dark ? 'font-bold text-[15px] text-ink-foreground/70' : 'font-bold text-[15px] text-muted-foreground'}>
                ‹ Back
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          {!last ? (
            <Pressable onPress={onDone} hitSlop={12} accessibilityRole="button" className="px-2 py-2">
              <Text className={slide.dark ? 'font-bold text-[14px] text-ink-foreground/70' : 'font-bold text-[14px] text-muted-foreground'}>
                Skip
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        {/* Photography carries the weight; a tinted panel stands in until the
            marketing images are bundled. */}
        <View
          className={
            slide.dark
              ? 'mt-2 flex-1 items-center justify-center rounded-lg border border-white/10'
              : 'mt-2 flex-1 items-center justify-center rounded-lg border border-border bg-secondary'
          }
        >
          {slide.image ? (
            <Image source={slide.image} resizeMode="cover" className="h-full w-full rounded-lg" />
          ) : (
            <Text
              className={slide.dark ? 'font-black text-[64px] text-ink-foreground/15' : 'font-black text-[64px] text-primary/15'}
            >
              {index === 1 ? 'PN' : 'PC'}
            </Text>
          )}
        </View>

        <View className="gap-3 py-7">
          <Eyebrow className={slide.dark ? 'text-brand' : 'text-primary'}>{slide.eyebrow}</Eyebrow>
          <H1 className={slide.dark ? 'text-ink-foreground' : undefined}>{slide.title}</H1>
          <Muted className={slide.dark ? 'text-ink-foreground/70' : undefined}>{slide.body}</Muted>
        </View>

        <View className="flex-row items-center justify-between pb-2">
          <Dots
            count={SLIDES.length}
            active={index}
            activeColor={slide.dark ? colors.brand : colors.primary}
          />

          {last ? (
            <View className="flex-1 pl-6">
              <Button label="Get started" onPress={onDone} />
            </View>
          ) : (
            <Pressable
              onPress={() => setIndex((i) => i + 1)}
              accessibilityRole="button"
              accessibilityLabel="Next"
              className={
                slide.dark
                  ? 'h-14 w-14 items-center justify-center rounded-pill bg-brand active:opacity-85'
                  : 'h-14 w-14 items-center justify-center rounded-pill bg-primary active:opacity-85'
              }
            >
              <Text className={slide.dark ? 'font-black text-[20px] text-brand-foreground' : 'font-black text-[20px] text-primary-foreground'}>
                ›
              </Text>
            </Pressable>
          )}
        </View>

        {last ? (
          <Pressable onPress={onDone} accessibilityRole="button" className="items-center py-3">
            <Text className="font-bold text-[14px] text-primary">I already have an account</Text>
          </Pressable>
        ) : (
          <View className="h-11" />
        )}
      </View>
    </SafeAreaView>
  )
}

import { createContext, useContext, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'

import { useColorScheme } from 'nativewind'

import { useColors, type Palette } from '../lib/theme'

/**
 * The app's whole UI vocabulary. Small on purpose: the spec's visual system is
 * one palette, one type scale and a handful of shapes, so screens compose these
 * rather than inventing styles.
 *
 * Text inherits its class from context (the react-native-reusables pattern), so
 * a Button or Badge can set the colour once and every string inside follows.
 */

const TextClassContext = createContext<string | undefined>(undefined)

export function Text({ className, ...props }: TextProps & { className?: string }) {
  const inherited = useContext(TextClassContext)
  return <RNText className={[inherited, className].filter(Boolean).join(' ')} {...props} />
}

/* ── Layout ───────────────────────────────────────────────────────────────── */

/** 22px gutters per the spec, with the safe area handled once. */
export function Screen({
  children,
  edges = ['top'],
  className,
}: {
  children: ReactNode
  edges?: Edge[]
  className?: string
}) {
  return (
    <SafeAreaView edges={edges} className={['flex-1 bg-background', className].filter(Boolean).join(' ')}>
      {children}
    </SafeAreaView>
  )
}

export function Body({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 22, paddingBottom: 40, gap: 16 }}
      className={className}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  )
}

export function Card({ children, className, ...rest }: ViewProps & { className?: string; children: ReactNode }) {
  return (
    <View
      className={['rounded-lg border border-border bg-card p-4', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </View>
  )
}

export function Divider({ className }: { className?: string }) {
  return <View className={['h-px bg-border', className].filter(Boolean).join(' ')} />
}

/* ── Type ─────────────────────────────────────────────────────────────────── */

export function H1({ children, className }: { children: ReactNode; className?: string }) {
  // -0.03em tracking at this size, per the spec.
  return (
    <Text
      className={['font-black text-[30px] leading-[36px] text-foreground', className].filter(Boolean).join(' ')}
      style={{ letterSpacing: -0.9 }}
    >
      {children}
    </Text>
  )
}

export function H2({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text
      className={['font-black text-[21px] leading-[27px] text-foreground', className].filter(Boolean).join(' ')}
      style={{ letterSpacing: -0.5 }}
    >
      {children}
    </Text>
  )
}

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text className={['font-sans text-[14px] leading-[21px] text-muted-foreground', className].filter(Boolean).join(' ')}>
      {children}
    </Text>
  )
}

/** Uppercase metadata: step counters, service counts, booking IDs, eyebrows. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text
      className={['font-mono text-[11px] uppercase text-muted-foreground', className].filter(Boolean).join(' ')}
      style={{ letterSpacing: 1.4 }}
    >
      {children}
    </Text>
  )
}

/* ── Controls ─────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'brand' | 'outline' | 'ghost' | 'dark'

const BUTTON_BG: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  brand: 'bg-brand',
  dark: 'bg-ink',
  outline: 'border border-border bg-transparent',
  ghost: 'bg-transparent',
}

const BUTTON_TEXT: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  brand: 'text-brand-foreground',
  dark: 'text-ink-foreground',
  outline: 'text-foreground',
  ghost: 'text-primary',
}

const SPINNER: Record<ButtonVariant, (c: Palette) => string> = {
  primary: (c) => c.primaryForeground,
  brand: (c) => c.brandForeground,
  dark: (c) => c.inkForeground,
  outline: (c) => c.primary,
  ghost: (c) => c.primary,
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  className,
}: {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  className?: string
}) {
  const colors = useColors()
  const off = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      // 16px radius and a 52px target — the spec's floor is 44px.
      className={[
        'h-[52px] flex-row items-center justify-center gap-2 rounded-[16px] px-5 active:opacity-85',
        BUTTON_BG[variant],
        off ? 'opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? <ActivityIndicator color={SPINNER[variant](colors)} /> : null}
      <Text className={['font-bold text-[15px]', BUTTON_TEXT[variant]].join(' ')}>{label}</Text>
    </Pressable>
  )
}

export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: TextInputProps & { label?: string; hint?: string; error?: string; className?: string }) {
  const colors = useColors()
  const { colorScheme: scheme } = useColorScheme()
  return (
    <View className={['gap-1.5', className].filter(Boolean).join(' ')}>
      {label ? <Eyebrow>{label}</Eyebrow> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        keyboardAppearance={scheme === 'dark' ? 'dark' : 'light'}
        className={[
          'h-[52px] rounded-md border bg-card px-4 font-sans text-[15px] text-foreground',
          error ? 'border-destructive' : 'border-input',
          props.multiline ? 'h-auto py-3' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error ? (
        <Text className="font-sans text-[12px] text-destructive">{error}</Text>
      ) : hint ? (
        <Text className="font-sans text-[12px] text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  )
}

/** Pill chip. Selected state is a filled shape, never colour alone. */
export function Chip({
  label,
  selected,
  onPress,
  className,
}: {
  label: string
  selected: boolean
  onPress: () => void
  className?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={[
        'min-h-[44px] justify-center rounded-pill border px-4 active:opacity-80',
        selected ? 'border-ink bg-ink' : 'border-border bg-card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Text className={selected ? 'font-bold text-[13px] text-ink-foreground' : 'font-medium text-[13px] text-foreground'}>
        {label}
      </Text>
    </Pressable>
  )
}

type Tone = 'default' | 'brand' | 'success' | 'warning' | 'destructive' | 'muted'

const BADGE: Record<Tone, { bg: string; fg: string }> = {
  default: { bg: 'bg-secondary', fg: 'text-primary' },
  brand: { bg: 'bg-brand/20', fg: 'text-foreground' },
  success: { bg: 'bg-success/12', fg: 'text-success' },
  warning: { bg: 'bg-warning/15', fg: 'text-warning' },
  destructive: { bg: 'bg-destructive/12', fg: 'text-destructive' },
  muted: { bg: 'bg-muted', fg: 'text-muted-foreground' },
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: Tone }) {
  const t = BADGE[tone]
  return (
    <View className={`self-start rounded-pill px-2.5 py-1 ${t.bg}`}>
      <Text className={`font-bold text-[11px] uppercase ${t.fg}`} style={{ letterSpacing: 0.6 }}>
        {label}
      </Text>
    </View>
  )
}

/** Three-dot pager on the intro screens. */
export function Dots({ count, active, activeColor }: { count: number; active: number; activeColor?: string }) {
  const colors = useColors()
  return (
    <View className="flex-row items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          className={i === active ? 'h-2 w-6 rounded-pill' : 'h-2 w-2 rounded-pill bg-border'}
          style={i === active ? { backgroundColor: activeColor ?? colors.primary } : undefined}
        />
      ))}
    </View>
  )
}

export function Loading({ label }: { label?: string }) {
  const colors = useColors()
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background p-10">
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Muted>{label}</Muted> : null}
    </View>
  )
}

/**
 * Pull-to-refresh, themed. The platform default is a light puck with a dark
 * arrow, which sits on a dark screen as a bright white disc.
 */
export function Refresher({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const colors = useColors()
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
    />
  )
}

export function Banner({ tone = 'destructive', children }: { tone?: Tone; children: ReactNode }) {
  const t = BADGE[tone]
  return (
    <View className={`rounded-md p-3 ${t.bg}`}>
      <Text className={`font-medium text-[13px] leading-5 ${t.fg}`}>{children}</Text>
    </View>
  )
}

/** Sticky bottom action bar: price on the left, primary action filling the rest. */
export function StickyBar({ children }: { children: ReactNode }) {
  const colors = useColors()
  return (
    <SafeAreaView edges={['bottom']} className="border-t border-border bg-card">
      <View
        className="flex-row items-center gap-3 px-[22px] py-3"
        style={{
          shadowColor: colors.ink,
          shadowOpacity: 0.08,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -8 },
          elevation: 12,
        }}
      >
        {children}
      </View>
    </SafeAreaView>
  )
}

export { TextClassContext }

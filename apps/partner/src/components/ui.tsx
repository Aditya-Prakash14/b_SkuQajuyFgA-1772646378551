/**
 * App-level composites over the shadcn-style primitives in ./ui/*
 * (react-native-reusables pattern: cva variants + NativeWind classes).
 * The screens consume this API; the primitives stay generic.
 */
import { ReactNode } from 'react'
import { ActivityIndicator, Pressable, View, type TextInputProps } from 'react-native'

import { cn } from '../lib/utils'
import { Alert } from './ui/alert'
import { Button as UIButton } from './ui/button'
import { Card as UICard } from './ui/card'
import { Input } from './ui/input'
import { Label as UILabel } from './ui/label'
import { Text } from './ui/text'

export { Badge } from './ui/badge'
export { Text } from './ui/text'

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View className="gap-5">
      <Text className="text-[26px] font-extrabold tracking-tight text-foreground">{title}</Text>
      {subtitle ? <Text className="-mt-3 text-sm leading-5 text-muted-foreground">{subtitle}</Text> : null}
      <View className="gap-4">{children}</View>
    </View>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <UICard className={cn('gap-3 p-4', className)}>{children}</UICard>
}

export function Field({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View className="gap-1.5">
      <UILabel>{label}</UILabel>
      <Input invalid={!!error} {...props} />
      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : hint ? (
        <Text className="text-xs leading-4 text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  )
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'brand' | 'ghost'
}) {
  const mapped = variant === 'primary' ? 'default' : variant === 'brand' ? 'brand' : 'outline'
  return (
    <UIButton variant={mapped} onPress={onPress} loading={loading} disabled={disabled}>
      <Text>{label}</Text>
    </UIButton>
  )
}

export function Banner({ tone, children }: { tone: 'error' | 'success' | 'warn' | 'info'; children: ReactNode }) {
  const variant = tone === 'error' ? 'destructive' : tone === 'warn' ? 'warning' : tone
  return (
    <Alert variant={variant}>
      <Text>{children}</Text>
    </Alert>
  )
}

/** Wizard progress. `current` is 0-indexed. */
export function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <View className="flex-row gap-2">
      {labels.map((l, i) => (
        <View key={l} className="flex-1 gap-1.5">
          <View className={cn('h-1 rounded-full bg-border', i <= current && 'bg-primary')} />
          <Text className={cn('text-[11px] text-muted-foreground/70', i <= current && 'font-bold text-primary')}>
            {l}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'rounded-full border border-input bg-card px-3.5 py-2 active:opacity-80',
        selected && 'border-primary bg-primary',
      )}
    >
      <Text className={cn('text-[13px] text-foreground', selected && 'font-bold text-primary-foreground')}>
        {label}
      </Text>
    </Pressable>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <UILabel>{children}</UILabel>
}

export function Loading({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center p-10">
      <ActivityIndicator color="#0E5A63" size="large" />
      {label ? <Text className="mt-3 text-xs text-muted-foreground">{label}</Text> : null}
    </View>
  )
}

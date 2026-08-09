import { View, type ViewProps } from 'react-native'

import { cn } from '../../lib/utils'
import { Text } from './text'

type P = ViewProps & { className?: string }

export function Card({ className, ...props }: P) {
  return (
    <View
      className={cn('rounded-lg border border-border bg-card shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: P) {
  return <View className={cn('gap-1.5 p-4 pb-2', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-lg font-bold text-card-foreground', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: P) {
  return <View className={cn('gap-3 p-4', className)} {...props} />
}

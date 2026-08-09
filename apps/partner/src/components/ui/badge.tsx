import { cva, type VariantProps } from 'class-variance-authority'
import { View, type ViewProps } from 'react-native'

import { cn } from '../../lib/utils'
import { TextClassContext } from './text'

const badgeVariants = cva('flex-row items-center self-start rounded-full border px-2.5 py-0.5', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary/10',
      brand: 'border-transparent bg-brand/15',
      secondary: 'border-transparent bg-muted',
      success: 'border-transparent bg-success/10',
      warning: 'border-transparent bg-warning/10',
      destructive: 'border-transparent bg-destructive/10',
      outline: 'border-border',
    },
  },
  defaultVariants: { variant: 'default' },
})

const badgeTextVariants = cva('text-[11px] font-bold uppercase tracking-wide', {
  variants: {
    variant: {
      default: 'text-primary',
      brand: 'text-brand',
      secondary: 'text-muted-foreground',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
      outline: 'text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({
  className,
  variant,
  ...props
}: ViewProps & VariantProps<typeof badgeVariants> & { className?: string }) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <View className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  )
}

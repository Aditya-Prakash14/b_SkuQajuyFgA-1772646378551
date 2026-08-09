import { cva, type VariantProps } from 'class-variance-authority'
import { View, type ViewProps } from 'react-native'

import { cn } from '../../lib/utils'
import { TextClassContext } from './text'

const alertVariants = cva('rounded-md border px-3.5 py-3', {
  variants: {
    variant: {
      info: 'border-primary/25 bg-primary/5',
      success: 'border-success/30 bg-success/5',
      warning: 'border-warning/30 bg-warning/5',
      destructive: 'border-destructive/30 bg-destructive/5',
    },
  },
  defaultVariants: { variant: 'info' },
})

const alertTextVariants = cva('text-[13px] leading-5', {
  variants: {
    variant: {
      info: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: { variant: 'info' },
})

export function Alert({
  className,
  variant,
  ...props
}: ViewProps & VariantProps<typeof alertVariants> & { className?: string }) {
  return (
    <TextClassContext.Provider value={alertTextVariants({ variant })}>
      <View role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  )
}

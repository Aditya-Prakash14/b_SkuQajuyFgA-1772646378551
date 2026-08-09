import { cva, type VariantProps } from 'class-variance-authority'
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native'

import { cn } from '../../lib/utils'
import { TextClassContext } from './text'

const buttonVariants = cva(
  'flex-row items-center justify-center gap-2 rounded-md active:opacity-80 disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        // Brand orange CTA — same token split as the web apps.
        brand: 'bg-brand shadow-sm',
        destructive: 'bg-destructive',
        outline: 'border border-input bg-card active:bg-accent',
        ghost: 'active:bg-accent',
        link: '',
      },
      size: {
        default: 'h-12 px-5 py-3',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-14 rounded-md px-8',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

const buttonTextVariants = cva('text-sm font-bold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      brand: 'text-brand-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
      link: 'text-primary underline-offset-4',
    },
    size: { default: 'text-[15px]', sm: 'text-sm', lg: 'text-base', icon: '' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

export type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    className?: string
    loading?: boolean
  }

export function Button({ className, variant, size, loading, disabled, children, ...props }: ButtonProps) {
  const spinnerColor = variant === 'outline' || variant === 'ghost' || variant === 'link' ? '#2E1BAD' : '#FFFFFF'
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        accessibilityRole="button"
        {...props}
      >
        {loading ? <ActivityIndicator color={spinnerColor} /> : children}
      </Pressable>
    </TextClassContext.Provider>
  )
}

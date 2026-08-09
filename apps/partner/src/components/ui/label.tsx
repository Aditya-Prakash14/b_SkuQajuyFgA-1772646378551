import { cn } from '../../lib/utils'
import { Text } from './text'

export function Label({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('text-[11px] font-bold uppercase tracking-wider text-muted-foreground', className)}
      {...props}
    />
  )
}

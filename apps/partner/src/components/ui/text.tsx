import { createContext, useContext } from 'react'
import { Text as RNText, type TextProps } from 'react-native'

import { cn } from '../../lib/utils'

/**
 * react-native-reusables pattern: a parent (e.g. Button) publishes text classes
 * through context so its children's <Text> picks up the right color/weight
 * without prop-drilling.
 */
export const TextClassContext = createContext<string | undefined>(undefined)

export function Text({ className, ...props }: TextProps & { className?: string }) {
  const textClass = useContext(TextClassContext)
  return <RNText className={cn('text-base text-foreground', textClass, className)} {...props} />
}

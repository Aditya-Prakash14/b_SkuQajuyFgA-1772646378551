import { TextInput, type TextInputProps } from 'react-native'

import { cn } from '../../lib/utils'

export type InputProps = TextInputProps & { className?: string; invalid?: boolean }

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor="#9CA3AF"
      className={cn(
        'h-12 rounded-md border border-input bg-card px-3.5 text-[15px] text-foreground',
        'focus:border-ring',
        invalid && 'border-destructive bg-destructive/5',
        props.editable === false && 'opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, invalid, ...props }: InputProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor="#9CA3AF"
      className={cn(
        'min-h-24 rounded-md border border-input bg-card px-3.5 py-3 text-[15px] text-foreground',
        'focus:border-ring',
        invalid && 'border-destructive bg-destructive/5',
        className,
      )}
      {...props}
    />
  )
}

'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-border bg-card text-card-foreground shadow-lg',
        },
      }}
      {...props}
    />
  )
}

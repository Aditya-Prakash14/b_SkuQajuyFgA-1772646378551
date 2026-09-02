'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Read-only star display (supports halves visually via fill). */
export function Stars({ value, className = 'w-4 h-4' }: { value: number; className?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            className,
            n <= Math.round(value) ? 'fill-foreground text-foreground' : 'fill-muted text-muted',
          )}
        />
      ))}
    </div>
  )
}

/** Interactive 1–5 star input. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <Button
          key={n}
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-checked={value === n}
          role="radio"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110 hover:bg-transparent"
        >
          <Star
            className={cn(
              'size-7',
              n <= shown ? 'fill-foreground text-foreground' : 'fill-muted text-muted-foreground/40',
            )}
          />
        </Button>
      ))}
    </div>
  )
}

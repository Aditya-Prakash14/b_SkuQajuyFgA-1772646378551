'use client'

import { useState } from 'react'
import { Phone, MapPin, Calendar, ShoppingBag, CheckCircle, LocateFixed, Loader2 } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCity } from '@/lib/city-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  name: string
  img: string
  price: number
  priceStr: string
}

export default function ServiceBookingCard({ id, name, img, price, priceStr }: Props) {
  const { addToCart, cart, setCartOpen } = useCart()
  const { city, setCity, cities, detectCity, detecting } = useCity()
  const inCart = cart.some((c) => c.id === id)
  const [added, setAdded] = useState(false)

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  const handleAdd = () => {
    addToCart({ id, name, img, price, priceStr })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-lg">
      <div className="bg-primary p-5 text-primary-foreground">
        <p className="mb-1 text-sm opacity-80">Starting from</p>
        <p className="text-4xl font-black">{priceStr}</p>
        <p className="mt-1 text-sm opacity-70">Inclusive of all taxes</p>
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Select City</Label>
            <Button
              type="button"
              variant="link"
              onClick={detectCity}
              disabled={detecting}
              className="h-auto gap-1 p-0 text-[11px] font-semibold"
            >
              {detecting ? <Loader2 className="size-3 animate-spin" /> : <LocateFixed className="size-3" />}
              {detecting ? 'Detecting…' : 'Detect'}
            </Button>
          </div>
          {/* Radix Select reserves "" for "no value" — undefined shows the placeholder. */}
          <Select value={city ?? undefined} onValueChange={setCity}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <span className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-primary" />
                <SelectValue placeholder="Choose your city" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="preferred-date" className="text-xs uppercase tracking-wide text-muted-foreground">
            Preferred Date
          </Label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <Input id="preferred-date" type="date" min={minDateStr} className="h-11 rounded-xl pl-9" />
          </div>
        </div>

        <Button
          onClick={handleAdd}
          variant="brand"
          size="lg"
          className={cn(
            'w-full rounded-xl font-bold shadow-md shadow-brand/30',
            (added || inCart) && 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-600/90',
          )}
        >
          {added || inCart ? (
            <><CheckCircle /> Added to Cart</>
          ) : (
            <><ShoppingBag /> Add to Cart</>
          )}
        </Button>

        {inCart && (
          <Button
            onClick={() => setCartOpen(true)}
            variant="outline"
            className="w-full rounded-xl border-2 border-brand font-bold text-brand hover:bg-brand/5 hover:text-brand"
          >
            View Cart &amp; Book
          </Button>
        )}

        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full rounded-xl border-2 border-primary font-bold text-primary hover:bg-primary/5 hover:text-primary"
        >
          <a href="tel:+917349603429">
            <Phone /> Call to Book
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

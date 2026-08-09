import { Construction } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function ModulePlaceholder({
  title,
  phase,
  description,
  planned,
}: {
  title: string
  phase: string
  description: string
  planned: string[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-brand" />
            <CardTitle>Being built next</CardTitle>
            <Badge variant="secondary">{phase}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {planned.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-brand">•</span>
                {p}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

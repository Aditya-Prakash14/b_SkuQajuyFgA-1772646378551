import type { Metadata } from 'next'
import FestivalCalendar from '@/components/festival-calendar'

export const metadata: Metadata = { title: 'Festival Calendar' }

/**
 * Festival planning calendar. The dataset lives in @prime/shared/festivals —
 * the same data drives the automatic festive theming on the public website,
 * so what this page shows as "website theme" is exactly what visitors get.
 */
export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Festival Calendar</h1>
        <p className="text-muted-foreground">
          Major Indian and universal festivals — plan campaigns, staffing and festive offers.
        </p>
      </div>
      <FestivalCalendar />
    </div>
  )
}

import { describe, expect, it } from 'vitest'
import { activeFestivalTheme, festivalsForYear, festivalsInMonth, upcomingFestivals } from './festivals'

describe('festivalsForYear', () => {
  it('includes fixed and dated festivals for 2026, sorted', () => {
    const year = festivalsForYear(2026)
    const ids = year.map((o) => o.festival.id)
    expect(ids).toContain('republic-day')
    expect(ids).toContain('diwali')
    const times = year.map((o) => o.date.getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(year.find((o) => o.festival.id === 'diwali')!.date).toEqual(new Date(2026, 10, 8))
  })

  it('omits dated festivals for years missing from the table', () => {
    const ids = festivalsForYear(2031).map((o) => o.festival.id)
    expect(ids).toContain('christmas') // fixed still present
    expect(ids).not.toContain('diwali')
  })
})

describe('festivalsInMonth', () => {
  it('finds Diwali in November 2026', () => {
    const ids = festivalsInMonth(2026, 10).map((o) => o.festival.id)
    expect(ids).toContain('diwali')
    expect(ids).toContain('dhanteras')
  })

  it('pulls a multi-day festival into the month its span reaches', () => {
    // Navratri 2026 starts Oct 11 and runs 9 days — all inside October.
    const ids = festivalsInMonth(2026, 9).map((o) => o.festival.id)
    expect(ids).toContain('navratri')
  })
})

describe('activeFestivalTheme', () => {
  it('is Christmas from Dec 13 through Dec 26', () => {
    expect(activeFestivalTheme(new Date(2026, 11, 13))?.festival.id).toBe('christmas')
    expect(activeFestivalTheme(new Date(2026, 11, 26))?.festival.id).toBe('christmas')
  })

  it('hands over from Christmas to New Year on Dec 27', () => {
    expect(activeFestivalTheme(new Date(2026, 11, 27))?.festival.id).toBe('new-year')
    expect(activeFestivalTheme(new Date(2027, 0, 1))?.festival.id).toBe('new-year')
  })

  it('is Diwali in the run-up window', () => {
    expect(activeFestivalTheme(new Date(2026, 10, 1))?.festival.id).toBe('diwali')
  })

  it('is null on an ordinary day', () => {
    expect(activeFestivalTheme(new Date(2026, 6, 7))).toBeNull()
  })
})

describe('upcomingFestivals', () => {
  it('returns the next festivals including today, crossing the year boundary', () => {
    const next = upcomingFestivals(new Date(2026, 11, 25), 3)
    expect(next[0].festival.id).toBe('christmas')
    expect(next.map((o) => o.festival.id)).toContain('new-year')
  })
})

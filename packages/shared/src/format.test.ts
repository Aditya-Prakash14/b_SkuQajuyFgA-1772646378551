import { describe, expect, it } from 'vitest'
import { formatINR, formatINRShort, priceLabel } from './format'

describe('formatINR', () => {
  it('uses the Indian digit grouping (lakh/crore), not thousands', () => {
    // 1,00,000 in en-IN — NOT 100,000
    expect(formatINR(100000)).toContain('1,00,000')
  })

  it('formats a normal price', () => {
    expect(formatINR(1499)).toContain('1,499')
  })

  it('handles zero without throwing', () => {
    expect(formatINR(0)).toContain('0')
  })

  it('coerces null/undefined to 0 rather than NaN', () => {
    // @ts-expect-error — deliberately passing a bad value
    expect(formatINR(undefined)).not.toContain('NaN')
  })
})

describe('formatINRShort', () => {
  it('drops the paise', () => {
    const s = formatINRShort(1499)
    expect(s).toContain('1,499')
    expect(s).not.toContain('.00')
  })
})

describe('priceLabel', () => {
  it('fixed price has no unit suffix', () => {
    expect(priceLabel(1499, 'fixed')).toMatch(/1,499$/)
  })

  it('per_sqft appends the unit', () => {
    expect(priceLabel(7, 'per_sqft')).toMatch(/7 \/ sq\. ft\.$/)
  })

  it('per_panel appends the unit', () => {
    expect(priceLabel(99, 'per_panel')).toMatch(/99 \/ panel$/)
  })

  it('per_seat appends the unit', () => {
    expect(priceLabel(299, 'per_seat')).toMatch(/299 \/ seat$/)
  })

  it('defaults to fixed when no unit is given', () => {
    expect(priceLabel(500)).toMatch(/500$/)
  })
})

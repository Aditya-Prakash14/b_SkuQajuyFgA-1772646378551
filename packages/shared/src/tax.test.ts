import { describe, it, expect } from 'vitest'
import { gstInclusive, gstHalves, GST_RATE } from './tax'

describe('gstInclusive (tax-inclusive 18% GST)', () => {
  it('never changes what the customer pays', () => {
    expect(gstInclusive(2499).total).toBe(2499)
  })

  it('derives the taxable value and GST from an inclusive price', () => {
    const b = gstInclusive(2499)
    // 2499 / 1.18 = 2117.80 (2dp), GST = the remainder
    expect(b.taxable).toBe(2117.8)
    expect(b.tax).toBe(381.2)
    expect(b.taxable + b.tax).toBe(b.total)
  })

  it('splits GST into equal CGST + SGST that sum back exactly', () => {
    const b = gstInclusive(2499)
    expect(b.cgst + b.sgst).toBe(b.tax)
    expect(b.cgst).toBe(190.6)
  })

  it('applies a discount before deriving GST', () => {
    const b = gstInclusive(1000, 100)
    expect(b.total).toBe(900)
    expect(b.taxable + b.tax).toBe(900)
  })

  it('clamps a discount larger than the gross to zero', () => {
    expect(gstInclusive(500, 999).total).toBe(0)
  })

  it('handles zero', () => {
    const b = gstInclusive(0)
    expect(b.total).toBe(0)
    expect(b.tax).toBe(0)
  })

  it('exposes the rate', () => {
    expect(GST_RATE).toBe(0.18)
  })
})

describe('gstHalves', () => {
  it('splits an odd-paisa tax so halves sum back to the whole', () => {
    const { cgst, sgst } = gstHalves(380.37)
    expect(cgst + sgst).toBe(380.37)
  })
})

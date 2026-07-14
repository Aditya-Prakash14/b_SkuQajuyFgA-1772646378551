import { describe, expect, it } from 'vitest'
import { CITIES, CITY_NAMES, SERVICE_RADIUS_KM, nearestCity } from './cities'

describe('city catalogue', () => {
  it('lists the 12 serviced cities', () => {
    expect(CITIES).toHaveLength(12)
    expect(CITY_NAMES).toContain('Bangalore')
    expect(CITY_NAMES).toContain('Noida')
  })

  it('every city has sane coordinates (inside India)', () => {
    for (const c of CITIES) {
      expect(c.lat).toBeGreaterThan(6)
      expect(c.lat).toBeLessThan(36)
      expect(c.lng).toBeGreaterThan(68)
      expect(c.lng).toBeLessThan(98)
    }
  })
})

describe('nearestCity (geolocation → serviced city)', () => {
  it('returns the exact city at ~0 km when standing in it', () => {
    const { city, distanceKm } = nearestCity(12.9716, 77.5946) // Bangalore centre
    expect(city.name).toBe('Bangalore')
    expect(distanceKm).toBeLessThanOrEqual(1)
  })

  it('maps a suburb to its city, within the service radius', () => {
    const r = nearestCity(12.9698, 77.75) // Whitefield, Bangalore
    expect(r.city.name).toBe('Bangalore')
    expect(r.distanceKm).toBeLessThan(SERVICE_RADIUS_KM)
  })

  it('maps Navi Mumbai to Mumbai, not Pune', () => {
    expect(nearestCity(19.033, 73.0297).city.name).toBe('Mumbai')
  })

  it('maps Faridabad into the NCR cluster', () => {
    const name = nearestCity(28.4089, 77.3178).city.name
    expect(['Delhi', 'Noida', 'Gurgaon']).toContain(name)
  })

  it('flags an unserviced location as beyond the radius (Kochi)', () => {
    const r = nearestCity(9.9312, 76.2673)
    expect(r.distanceKm).toBeGreaterThan(SERVICE_RADIUS_KM)
    expect(r.city.name).toBe('Bangalore') // still the closest of the 12
  })

  it('is symmetric-ish: distance is always non-negative and finite', () => {
    const r = nearestCity(22.5726, 88.3639) // Kolkata
    expect(r.distanceKm).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(r.distanceKm)).toBe(true)
    expect(r.city.name).toBe('Kolkata')
  })
})

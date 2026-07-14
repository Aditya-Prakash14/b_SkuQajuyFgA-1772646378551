'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CITY_NAMES, SERVICE_RADIUS_KM, nearestCity } from '@/lib/cities'

const STORAGE_KEY = 'primehomecare_city'

interface CityContextValue {
  city: string | null
  setCity: (city: string) => void
  cities: string[]
  /** Ask the browser for location and pick the nearest serviced city. */
  detectCity: () => void
  detecting: boolean
  detectMessage: string | null
  detectError: string | null
}

const CityContext = createContext<CityContextValue | null>(null)

export function CityProvider({ children, cities }: { children: ReactNode; cities?: string[] }) {
  const [city, setCityState] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectMessage, setDetectMessage] = useState<string | null>(null)
  const [detectError, setDetectError] = useState<string | null>(null)

  const list = cities?.length ? cities : CITY_NAMES

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setCityState(saved)
    } catch {}
  }, [])

  const setCity = useCallback((next: string) => {
    setCityState(next)
    setDetectError(null)
    setDetectMessage(null)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [])

  const detectCity = useCallback(() => {
    setDetectError(null)
    setDetectMessage(null)

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDetectError('Location is not supported by this browser.')
      return
    }

    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { city: nearest, distanceKm } = nearestCity(pos.coords.latitude, pos.coords.longitude)
        setCity(nearest.name)
        setDetecting(false)
        if (distanceKm > SERVICE_RADIUS_KM) {
          setDetectMessage(
            `We don't serve your exact area yet — showing ${nearest.name}, our closest city (~${distanceKm} km away).`,
          )
        } else {
          setDetectMessage(`Location detected — showing services in ${nearest.name}.`)
        }
      },
      (err) => {
        setDetecting(false)
        setDetectError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Please pick your city manually.'
            : 'Could not get your location. Please pick your city manually.',
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }, [setCity])

  return (
    <CityContext.Provider
      value={{ city, setCity, cities: list, detectCity, detecting, detectMessage, detectError }}
    >
      {children}
    </CityContext.Provider>
  )
}

export function useCity() {
  const ctx = useContext(CityContext)
  if (!ctx) throw new Error('useCity must be used inside CityProvider')
  return ctx
}

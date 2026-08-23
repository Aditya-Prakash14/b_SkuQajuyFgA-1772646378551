import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

/**
 * Read-through cache with an "are we offline" signal.
 *
 * Every catalogue and bookings read goes through cached(): a successful fetch
 * refreshes the stored copy; a failed one falls back to the last good copy and
 * flips the offline flag, which the Screen component turns into a banner.
 * Nothing here retries — the screens' own pull-to-refresh does that.
 */

const PREFIX = 'mpc.cache.'

let offline = false
const listeners = new Set<(v: boolean) => void>()

function setOffline(next: boolean) {
  if (next === offline) return
  offline = next
  listeners.forEach((l) => l(next))
}

export function useOffline() {
  const [value, setValue] = useState(offline)
  useEffect(() => {
    listeners.add(setValue)
    return () => {
      listeners.delete(setValue)
    }
  }, [])
  return value
}

export async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher()
    setOffline(false)
    AsyncStorage.setItem(PREFIX + key, JSON.stringify(data)).catch(() => {})
    return data
  } catch (err) {
    const raw = await AsyncStorage.getItem(PREFIX + key).catch(() => null)
    if (raw) {
      try {
        const data = JSON.parse(raw) as T
        setOffline(true)
        return data
      } catch {
        // A corrupt entry is no better than none.
      }
    }
    throw err
  }
}

/** Forget everything cached — on sign-out, so the next account never sees the last one's bookings. */
export async function clearCache() {
  const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[])
  const mine = keys.filter((k) => k.startsWith(PREFIX))
  if (mine.length) await AsyncStorage.multiRemove(mine).catch(() => {})
  setOffline(false)
}

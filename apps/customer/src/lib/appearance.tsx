import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'nativewind'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Light / dark / follow-the-phone, remembered between launches.
 *
 * NativeWind already tracks the OS scheme; what it does not do is remember an
 * explicit override, so a customer who picks Dark on an OS set to Light gets
 * their choice back only if we store it ourselves.
 */

export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'mpc.theme'

const AppearanceContext = createContext<{ pref: ThemePref; setPref: (p: ThemePref) => void }>({
  pref: 'system',
  setPref: () => {},
})

function isPref(v: string | null): v is ThemePref {
  return v === 'system' || v === 'light' || v === 'dark'
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useColorScheme()
  const [pref, setStored] = useState<ThemePref>('system')

  useEffect(() => {
    // Runs while the splash is up, so a saved choice is applied before the
    // first real screen paints.
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!isPref(v)) return
        setStored(v)
        setColorScheme(v)
      })
      .catch(() => {
        // A read failure just means we follow the OS — never a blocked launch.
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setPref(p: ThemePref) {
    setStored(p)
    setColorScheme(p)
    AsyncStorage.setItem(KEY, p).catch(() => {})
  }

  return <AppearanceContext.Provider value={{ pref, setPref }}>{children}</AppearanceContext.Provider>
}

export const useAppearance = () => useContext(AppearanceContext)

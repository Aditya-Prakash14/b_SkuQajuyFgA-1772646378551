import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { supabase } from './supabase'

/**
 * Push registration for job assignments.
 *
 * Reality check on where this can run:
 *   • Expo Go on Android (SDK 53+) cannot receive remote pushes at all — the
 *     capability was removed from the Go client. Registration is skipped there.
 *   • A development/store build (`eas build`) needs an EAS project id so Expo
 *     can mint a token; it is read from app.json → extra.eas.projectId. Missing
 *     id → skipped, with a one-line console hint, never a crash.
 * Everything here is best-effort: the app works without push, it just learns
 * about new jobs on the next refresh instead of instantly.
 */

// Foreground presentation: show the banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const inExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient'

export function pushSupportedHere() {
  if (!Device.isDevice) return false // simulators/emulators have no push credentials
  if (Platform.OS === 'android' && inExpoGo) return false
  return true
}

/** Ask for permission, fetch the Expo token, and store it on the vendor row. */
export async function registerForPush(): Promise<string | null> {
  if (!pushSupportedHere()) return null

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  if (!projectId) {
    console.log('[push] no EAS projectId in app.json (run `eas init`) — skipping registration')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('jobs', {
      name: 'Job assignments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8712C',
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status
  }
  if (status !== 'granted') return null

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    const { error } = await supabase.rpc('register_push_token', { p_token: token })
    if (error) console.log('[push] could not save token:', error.message)
    return token
  } catch (err) {
    console.log('[push] token fetch failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/** Clear the stored token so a signed-out device stops receiving job pushes. */
export async function unregisterPush() {
  try {
    await supabase.rpc('register_push_token', { p_token: '' })
  } catch {
    // best-effort
  }
}

/**
 * Subscribe to pushes arriving while the app is open (refresh the job list)
 * and to taps on a push (open that job). Returns an unsubscribe function.
 */
export function onPush(handlers: { onReceived?: (orderId: string | null) => void; onTap?: (orderId: string | null) => void }) {
  const orderIdOf = (n: Notifications.Notification) => {
    const d = n.request.content.data as { order_id?: unknown } | undefined
    return typeof d?.order_id === 'string' ? d.order_id : null
  }
  const a = Notifications.addNotificationReceivedListener((n) => handlers.onReceived?.(orderIdOf(n)))
  const b = Notifications.addNotificationResponseReceivedListener((r) => handlers.onTap?.(orderIdOf(r.notification)))
  return () => {
    a.remove()
    b.remove()
  }
}

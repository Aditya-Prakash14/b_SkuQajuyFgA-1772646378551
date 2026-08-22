import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

import { supabase } from './supabase'

/**
 * Push registration for job assignments.
 *
 * Reality check on where this can run:
 *   • Expo Go on Android (SDK 53+) cannot receive remote pushes at all — the
 *     capability was removed from the Go client.
 *   • A development/store build (`eas build`) needs an EAS project id so Expo
 *     can mint a token; it is read from app.json → extra.eas.projectId.
 * Everything here is best-effort: the app works without push, it just learns
 * about new jobs on the next refresh instead of instantly.
 *
 * `expo-notifications` is loaded LAZILY and only where push actually works.
 * Importing it at module scope is not harmless: its index re-exports
 * `DevicePushTokenAutoRegistration.fx`, whose top-level code calls
 * `addPushTokenListener()`, which calls `warnOfExpoGoPushUsage()` — so in Expo
 * Go on Android the mere import throws a red console error, before any runtime
 * guard of ours can run. Requiring it behind `pushSupportedHere()` keeps the
 * module out of the bundle's execution path entirely on that platform.
 *
 * The `typeof import(...)` below is a *type-only* construct and is erased at
 * compile time — it does not pull the module in.
 */

type NotificationsModule = typeof import('expo-notifications')

const inExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient'

export function pushSupportedHere() {
  if (!Device.isDevice) return false // simulators/emulators have no push credentials
  if (Platform.OS === 'android' && inExpoGo) return false
  return true
}

let cached: NotificationsModule | null = null
let handlerSet = false

/** The module, or null where remote push cannot work. Never imported otherwise. */
function notifications(): NotificationsModule | null {
  if (!pushSupportedHere()) return null
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule
    if (!handlerSet) {
      handlerSet = true
      // Foreground presentation: show the banner even while the app is open.
      cached.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      })
    }
  }
  return cached
}

/** Ask for permission, fetch the Expo token, and store it on the vendor row. */
export async function registerForPush(): Promise<string | null> {
  const Notifications = notifications()
  if (!Notifications) return null

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
      lightColor: '#E8A33D',
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
 * and to taps on a push (open that job). Returns an unsubscribe function —
 * a no-op where push is unavailable, so callers need no platform checks.
 */
export function onPush(handlers: {
  onReceived?: (orderId: string | null) => void
  onTap?: (orderId: string | null) => void
}) {
  const Notifications = notifications()
  if (!Notifications) return () => {}

  const orderIdOf = (n: { request: { content: { data?: unknown } } }) => {
    const d = n.request.content.data as { order_id?: unknown } | undefined
    return typeof d?.order_id === 'string' ? d.order_id : null
  }
  const a = Notifications.addNotificationReceivedListener((n) => handlers.onReceived?.(orderIdOf(n)))
  const b = Notifications.addNotificationResponseReceivedListener((r) =>
    handlers.onTap?.(orderIdOf(r.notification)),
  )
  return () => {
    a.remove()
    b.remove()
  }
}

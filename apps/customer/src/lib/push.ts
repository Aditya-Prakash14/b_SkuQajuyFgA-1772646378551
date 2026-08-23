import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

import { saveNotificationPrefs } from './bookings'

/**
 * Push registration for booking updates.
 *
 * Where this can actually run:
 *   • Expo Go on Android (SDK 53+) cannot receive remote pushes at all.
 *   • A development or store build needs an EAS project id so Expo can mint
 *     a token; it is read from app.json → extra.eas.projectId. Without one
 *     (no `eas init` yet) registration is skipped and logged.
 * Everything is best-effort: the app works without push — the tracking
 * screen is live over realtime anyway — it just is not told while closed.
 *
 * `expo-notifications` is loaded lazily, only where push works: importing it
 * at module scope throws in Expo Go on Android before any guard can run.
 * Same pattern as apps/partner/src/lib/push.ts.
 */

type NotificationsModule = typeof import('expo-notifications')

const inExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient'

export function pushSupportedHere() {
  if (!Device.isDevice) return false
  if (Platform.OS === 'android' && inExpoGo) return false
  return true
}

let cached: NotificationsModule | null = null
let handlerSet = false

function notifications(): NotificationsModule | null {
  if (!pushSupportedHere()) return null
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule
    if (!handlerSet) {
      handlerSet = true
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

/**
 * Ask for permission, fetch the Expo token, store it on the customer's prefs.
 * With `prompt: false` (app launch) an ungranted permission is left alone —
 * the system prompt only ever follows a tap.
 */
export async function registerForPush({ prompt = true }: { prompt?: boolean } = {}): Promise<string | null> {
  const Notifications = notifications()
  if (!Notifications) return null

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  if (!projectId) {
    if (__DEV__) console.log('[push] no EAS projectId in app.json (run `eas init`) — skipping registration')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Booking updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0E5A63',
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted' && prompt) {
    status = (await Notifications.requestPermissionsAsync()).status
  }
  if (status !== 'granted') return null

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await saveNotificationPrefs({ token })
    return token
  } catch (err) {
    if (__DEV__) console.log('[push] token fetch failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/** Clear the stored token so a signed-out phone stops receiving this account's updates. */
export async function unregisterPush() {
  try {
    await saveNotificationPrefs({ token: '' })
  } catch {
    // best-effort: the session may already be gone
  }
}

export interface PushTarget {
  kind: 'deep' | 'now'
  id: string
}

/**
 * Subscribe to pushes arriving while the app is open and to taps on a push.
 * Returns an unsubscribe function — a no-op where push is unavailable.
 */
export function onPush(handlers: {
  onReceived?: (target: PushTarget | null) => void
  onTap?: (target: PushTarget | null) => void
}) {
  const Notifications = notifications()
  if (!Notifications) return () => {}

  const targetOf = (n: { request: { content: { data?: unknown } } }): PushTarget | null => {
    const d = n.request.content.data as { kind?: unknown; id?: unknown } | undefined
    if ((d?.kind === 'deep' || d?.kind === 'now') && typeof d.id === 'string') return { kind: d.kind, id: d.id }
    return null
  }
  const a = Notifications.addNotificationReceivedListener((n) => handlers.onReceived?.(targetOf(n)))
  const b = Notifications.addNotificationResponseReceivedListener((r) => handlers.onTap?.(targetOf(r.notification)))
  return () => {
    a.remove()
    b.remove()
  }
}

import { createNavigationContainerRef } from '@react-navigation/native'

/**
 * A handle on the navigator for code that lives outside the tree — a push
 * notification tap has to open the right booking from the module that
 * received it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const navigationRef = createNavigationContainerRef<any>()

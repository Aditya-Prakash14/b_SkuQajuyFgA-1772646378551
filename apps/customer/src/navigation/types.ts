import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import type { Booking } from '../lib/types'

/**
 * Route params. Ids are passed rather than whole objects so a screen always
 * reads current data instead of rendering a stale snapshot handed to it by the
 * previous screen.
 */
export type HomeStackParams = {
  Home: undefined
  Categories: undefined
  Services: { categoryId: string; categoryName: string }
  ServiceDetail: { serviceId: string }
  Cart: undefined
  SlotPayment: undefined
  Confirmed: { reference: string }
  // Prime Now
  PrimeSlot: undefined
  PrimeDescribe: { slot: string }
  PrimeWhen: { slot: string; tasks: string[]; notes: string }
  PrimeMatching: { requestId: string; reference: string }
}

export type BookingsStackParams = {
  MyBookings: undefined
  Tracking: { booking: Booking }
  RateTip: { booking: Booking }
}

export type HomeStackProps<T extends keyof HomeStackParams> = NativeStackScreenProps<HomeStackParams, T>
export type BookingsStackProps<T extends keyof BookingsStackParams> = NativeStackScreenProps<
  BookingsStackParams,
  T
>

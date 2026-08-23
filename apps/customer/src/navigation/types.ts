import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import type { Booking } from '../lib/types'

/**
 * Route params. Ids are passed rather than whole objects so a screen always
 * reads current data instead of rendering a stale snapshot handed to it by the
 * previous screen. (Tracking is the exception: it receives the booking because
 * the list already has it, and refreshes the parts that change.)
 */

/** The address screens live in two stacks; they only need these two routes. */
export type AddressRoutes = {
  Addresses: undefined
  AddressForm: { addressId?: string; returnTo?: 'SlotPayment' | 'PrimeWhen' }
}

export type HomeStackParams = AddressRoutes & {
  Home: undefined
  Categories: undefined
  Services: { categoryId: string; categoryName: string }
  ServiceDetail: { serviceId: string }
  Cart: undefined
  SlotPayment: { addressId?: string } | undefined
  Confirmed: { reference: string }
  // Prime Now
  PrimeSlot: undefined
  PrimeDescribe: { slot: string }
  PrimeWhen: { slot: string; tasks: string[]; notes: string; addressId?: string }
  PrimeMatching: { requestId: string; reference: string }
}

export type BookingsStackParams = {
  MyBookings: undefined
  Tracking: { booking: Booking }
  RateTip: { booking: Booking }
}

export type AccountStackParams = AddressRoutes & {
  AccountHome: undefined
}

export type HomeStackProps<T extends keyof HomeStackParams> = NativeStackScreenProps<HomeStackParams, T>
export type BookingsStackProps<T extends keyof BookingsStackParams> = NativeStackScreenProps<
  BookingsStackParams,
  T
>
export type AccountStackProps<T extends keyof AccountStackParams> = NativeStackScreenProps<AccountStackParams, T>
export type AddressRouteProps<T extends keyof AddressRoutes> = NativeStackScreenProps<AddressRoutes, T>

import './global.css'

import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope'
import { Ionicons } from '@expo/vector-icons'
import { NavigationContainer, type Theme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { useEffect, useState } from 'react'
import { Text as RNText, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Text } from './src/components/ui'
import { AppearanceProvider } from './src/lib/appearance'
import { fetchBookings } from './src/lib/bookings'
import { CartProvider, useCart } from './src/lib/cart'
import { onPush, registerForPush } from './src/lib/push'
import { SessionProvider, useSession } from './src/lib/session'
import { useColors } from './src/lib/theme'
import { PHONE_OTP_ENABLED } from './src/lib/supabase'
import { navigationRef } from './src/navigation/ref'
import type { AccountStackParams, BookingsStackParams, HomeStackParams } from './src/navigation/types'
import { AccountScreen } from './src/screens/account/AccountScreen'
import { AddressFormScreen } from './src/screens/account/AddressFormScreen'
import { AddressesScreen } from './src/screens/account/AddressesScreen'
import { HelpScreen } from './src/screens/account/HelpScreen'
import { SignInScreen } from './src/screens/auth/SignInScreen'
import {
  AddressSetupScreen,
  NotificationsSetupScreen,
  ProfileSetupScreen,
} from './src/screens/auth/SetupScreens'
import { VerifyCodeScreen } from './src/screens/auth/VerifyCodeScreen'
import { MyBookingsScreen } from './src/screens/bookings/MyBookingsScreen'
import { RateTipScreen } from './src/screens/bookings/RateTipScreen'
import { ReceiptScreen } from './src/screens/bookings/ReceiptScreen'
import { TrackingScreen } from './src/screens/bookings/TrackingScreen'
import { CartScreen } from './src/screens/checkout/CartScreen'
import { ConfirmedScreen } from './src/screens/checkout/ConfirmedScreen'
import { SlotPaymentScreen } from './src/screens/checkout/SlotPaymentScreen'
import { CategoriesScreen } from './src/screens/deep/CategoriesScreen'
import { HomeScreen } from './src/screens/deep/HomeScreen'
import { ServiceDetailScreen } from './src/screens/deep/ServiceDetailScreen'
import { ServicesScreen } from './src/screens/deep/ServicesScreen'
import { PrimeDescribeScreen } from './src/screens/now/PrimeDescribeScreen'
import { PrimeMatchingScreen } from './src/screens/now/PrimeMatchingScreen'
import { PrimeSlotScreen } from './src/screens/now/PrimeSlotScreen'
import { PrimeWhenScreen } from './src/screens/now/PrimeWhenScreen'
import { IntroScreen } from './src/screens/onboarding/Intro'
import { SplashScreen } from './src/screens/onboarding/SplashScreen'

const HomeStack = createNativeStackNavigator<HomeStackParams>()
const BookingsStack = createNativeStackNavigator<BookingsStackParams>()
const AccountStack = createNativeStackNavigator<AccountStackParams>()
const Tabs = createBottomTabNavigator()

const NAV_FONTS = {
  regular: { fontFamily: 'Manrope_400Regular', fontWeight: '400' },
  medium: { fontFamily: 'Manrope_500Medium', fontWeight: '500' },
  bold: { fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  heavy: { fontFamily: 'Manrope_800ExtraBold', fontWeight: '800' },
} as const

/**
 * Navigation chrome cannot take a className, so it is built from the active
 * palette instead. Both must be derived per render, not module constants, or
 * headers and screen backgrounds stay light while the content goes dark.
 */
function useNavTheme(): Theme {
  const c = useColors()
  const { colorScheme } = useColorScheme()
  return {
    dark: colorScheme === 'dark',
    colors: {
      primary: c.primary,
      background: c.bg,
      card: c.card,
      text: c.text,
      border: c.border,
      notification: c.brand,
    },
    fonts: NAV_FONTS,
  }
}

function useStackOptions() {
  const c = useColors()
  return {
    headerShadowVisible: false,
    headerTintColor: c.primary,
    headerTitleStyle: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: c.text },
    headerStyle: { backgroundColor: c.bg },
    contentStyle: { backgroundColor: c.bg },
  }
}

function HomeNavigator() {
  const stackOptions = useStackOptions()
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Deep Cleaning' }} />
      <HomeStack.Screen
        name="Services"
        component={ServicesScreen}
        options={({ route }) => ({ title: route.params.categoryName })}
      />
      <HomeStack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: '' }} />
      <HomeStack.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
      <HomeStack.Screen name="SlotPayment" component={SlotPaymentScreen} options={{ title: 'Slot & payment' }} />
      <HomeStack.Screen
        name="Confirmed"
        component={ConfirmedScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <HomeStack.Screen name="PrimeSlot" component={PrimeSlotScreen} options={{ title: 'Prime Now' }} />
      <HomeStack.Screen name="PrimeDescribe" component={PrimeDescribeScreen} options={{ title: 'Prime Now' }} />
      <HomeStack.Screen name="PrimeWhen" component={PrimeWhenScreen} options={{ title: 'Prime Now' }} />
      <HomeStack.Screen
        name="PrimeMatching"
        component={PrimeMatchingScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      {/* The address book is reachable from checkout too, so it lives in this
          stack as well as in Account. */}
      <HomeStack.Screen name="Addresses" component={AddressesScreen} options={{ title: 'Addresses' }} />
      <HomeStack.Screen name="AddressForm" component={AddressFormScreen} options={{ title: 'Address' }} />
    </HomeStack.Navigator>
  )
}

function BookingsNavigator() {
  const stackOptions = useStackOptions()
  return (
    <BookingsStack.Navigator screenOptions={stackOptions}>
      <BookingsStack.Screen name="MyBookings" component={MyBookingsScreen} options={{ headerShown: false }} />
      <BookingsStack.Screen name="Tracking" component={TrackingScreen} options={{ title: 'Booking' }} />
      <BookingsStack.Screen name="RateTip" component={RateTipScreen} options={{ title: 'Rate' }} />
      <BookingsStack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Receipt' }} />
    </BookingsStack.Navigator>
  )
}

function AccountNavigator() {
  const stackOptions = useStackOptions()
  return (
    <AccountStack.Navigator screenOptions={stackOptions}>
      <AccountStack.Screen name="AccountHome" component={AccountScreen} options={{ headerShown: false }} />
      <AccountStack.Screen name="Addresses" component={AddressesScreen} options={{ title: 'Addresses' }} />
      <AccountStack.Screen name="AddressForm" component={AddressFormScreen} options={{ title: 'Address' }} />
    </AccountStack.Navigator>
  )
}

/**
 * Tab bar item. The spec's "no icon soup" is about decorating content, not
 * about navigation chrome — a bottom bar without icons does not read as one,
 * so each tab gets a single outline/filled pair and its label.
 */
type TabIcon = keyof typeof Ionicons.glyphMap

function TabItem({
  label,
  icon,
  focused,
  badge,
}: {
  label: string
  icon: TabIcon
  focused: boolean
  badge?: number
}) {
  const colors = useColors()
  const tint = focused ? colors.primary : colors.muted
  return (
    <View style={{ alignItems: 'center', gap: 3, width: 72 }}>
      <View>
        <Ionicons name={icon} size={22} color={tint} />
        {badge ? (
          <View
            className="absolute -right-2.5 -top-1 min-w-[16px] items-center rounded-pill bg-brand px-1"
            // Sits over the icon, so it must not stretch the row.
            style={{ paddingVertical: 1 }}
          >
            <Text className="font-bold text-[10px] text-brand-foreground">{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <RNText
        numberOfLines={1}
        style={{
          fontFamily: focused ? 'Manrope_700Bold' : 'Manrope_500Medium',
          fontSize: 11,
          color: tint,
        }}
      >
        {label}
      </RNText>
    </View>
  )
}

function MainTabs() {
  const colors = useColors()
  const { count } = useCart()
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
        },
        // The whole item is drawn in tabBarIcon, so the default label and icon
        // slots are switched off rather than fought with.
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Home"
              icon={focused ? 'home' : 'home-outline'}
              focused={focused}
              badge={count}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="BookingsTab"
        component={BookingsNavigator}
        options={{
          tabBarAccessibilityLabel: 'Bookings',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Bookings"
              icon={focused ? 'calendar' : 'calendar-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="HelpTab"
        component={HelpScreen}
        options={{
          tabBarAccessibilityLabel: 'Help',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Help"
              icon={focused ? 'help-circle' : 'help-circle-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="AccountTab"
        component={AccountNavigator}
        options={{
          tabBarAccessibilityLabel: 'Account',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Account"
              icon={focused ? 'person' : 'person-outline'}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs.Navigator>
  )
}

/**
 * What the app shows is derived from state, not from navigation history:
 * booting → intro → sign in → finish setup → the app. A user who is signed in
 * but has no address lands on the address step, per the spec.
 */
function Root() {
  const { session, booting, setupStep } = useSession()
  const [seenIntro, setSeenIntro] = useState(false)
  const [otpPhone, setOtpPhone] = useState<string | null>(null)

  if (booting) return <SplashScreen />

  if (!session) {
    if (!seenIntro) return <IntroScreen onDone={() => setSeenIntro(true)} />
    if (otpPhone && PHONE_OTP_ENABLED) {
      return <VerifyCodeScreen phone={otpPhone} onBack={() => setOtpPhone(null)} />
    }
    return <SignInScreen onCodeSent={setOtpPhone} />
  }

  if (setupStep === 'profile') return <ProfileSetupScreen />
  if (setupStep === 'address') return <AddressSetupScreen />
  if (setupStep === 'notifications') return <NotificationsSetupScreen />

  return <MainTabs />
}

/**
 * Push plumbing that needs both a session and the navigator: refresh the
 * token silently when permission is already granted, and open the booking a
 * tapped notification is about.
 */
function PushBridge() {
  const { session } = useSession()
  useEffect(() => {
    if (!session) return
    registerForPush({ prompt: false }).catch(() => {})
    return onPush({
      onTap: async (target) => {
        if (!target) return
        try {
          const all = await fetchBookings()
          const booking = all.find((b) => b.id === target.id && b.kind === target.kind)
          if (booking && navigationRef.isReady()) {
            navigationRef.navigate('BookingsTab', { screen: 'Tracking', params: { booking } })
          }
        } catch {
          // The Bookings tab is one tap away regardless.
        }
      },
    })
  }, [session])
  return null
}

function Shell() {
  const navTheme = useNavTheme()
  const { colorScheme } = useColorScheme()
  return (
    <>
      {/* Follows the theme, so the clock and battery stay legible on both. */}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <SessionProvider>
          <CartProvider>
            <PushBridge />
            <Root />
          </CartProvider>
        </SessionProvider>
      </NavigationContainer>
    </>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    // Load the icon font through the same gate as the text faces. Left to load
    // itself, @expo/vector-icons registers on first render — which Fast Refresh
    // does not re-run, so tab icons stay blank until the app is fully
    // restarted. Gating it here makes them appear on the first paint, always.
    ...Ionicons.font,
  })

  return (
    <SafeAreaProvider>
      <AppearanceProvider>{fontsLoaded ? <Shell /> : <SplashScreen />}</AppearanceProvider>
    </SafeAreaProvider>
  )
}

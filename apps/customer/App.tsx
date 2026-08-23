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
import { NavigationContainer, type Theme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { Text as RNText, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Text } from './src/components/ui'
import { CartProvider, useCart } from './src/lib/cart'
import { SessionProvider, useSession } from './src/lib/session'
import { colors } from './src/lib/theme'
import { PHONE_OTP_ENABLED } from './src/lib/supabase'
import type { BookingsStackParams, HomeStackParams } from './src/navigation/types'
import { AccountScreen } from './src/screens/account/AccountScreen'
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
const Tabs = createBottomTabNavigator()

const navTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.brand,
  },
  fonts: {
    regular: { fontFamily: 'Manrope_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Manrope_500Medium', fontWeight: '500' },
    bold: { fontFamily: 'Manrope_700Bold', fontWeight: '700' },
    heavy: { fontFamily: 'Manrope_800ExtraBold', fontWeight: '800' },
  },
}

const stackOptions = {
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: colors.text },
  headerStyle: { backgroundColor: colors.bg },
  contentStyle: { backgroundColor: colors.bg },
}

function HomeNavigator() {
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
    </HomeStack.Navigator>
  )
}

function BookingsNavigator() {
  return (
    <BookingsStack.Navigator screenOptions={stackOptions}>
      <BookingsStack.Screen name="MyBookings" component={MyBookingsScreen} options={{ headerShown: false }} />
      <BookingsStack.Screen name="Tracking" component={TrackingScreen} options={{ title: 'Booking' }} />
      <BookingsStack.Screen name="RateTip" component={RateTipScreen} options={{ title: 'Rate' }} />
    </BookingsStack.Navigator>
  )
}

/** Text-label tab bar — the spec asks for no icon soup. */
function TabLabel({ label, focused, badge }: { label: string; focused: boolean; badge?: number }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <RNText
        style={{
          fontFamily: focused ? 'Manrope_700Bold' : 'Manrope_500Medium',
          fontSize: 12,
          color: focused ? colors.primary : colors.muted,
        }}
      >
        {label}
      </RNText>
      {badge ? (
        <View className="min-w-[16px] items-center rounded-pill bg-brand px-1">
          <Text className="font-bold text-[10px] text-brand-foreground">{badge}</Text>
        </View>
      ) : null}
    </View>
  )
}

function MainTabs() {
  const { count } = useCart()
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62,
          paddingTop: 8,
        },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} badge={count} />,
        }}
      />
      <Tabs.Screen
        name="BookingsTab"
        component={BookingsNavigator}
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="Bookings" focused={focused} /> }}
      />
      <Tabs.Screen
        name="HelpTab"
        component={HelpScreen}
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="Help" focused={focused} /> }}
      />
      <Tabs.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="Account" focused={focused} /> }}
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

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  })

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer theme={navTheme}>
        <SessionProvider>
          <CartProvider>{fontsLoaded ? <Root /> : <SplashScreen />}</CartProvider>
        </SessionProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

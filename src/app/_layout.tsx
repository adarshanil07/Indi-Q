import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  BalooChettan2_500Medium,
  BalooChettan2_700Bold,
} from '@expo-google-fonts/baloo-chettan-2'
import { useFonts, Quicksand_500Medium, Quicksand_700Bold } from '@expo-google-fonts/quicksand'
import * as SplashScreen from 'expo-splash-screen'
import { GameProvider } from '@/store/GameContext'
import { IntroSequence } from '@/components/intro/IntroSequence'
import { initialiseAds } from '@/ads'
import { initialiseFeedback } from '@/feedback'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Quicksand: rounded geometric Latin closely matching the physical card's
  // lettering. Baloo Chettan 2: Malayalam-script companion for the grey
  // Malayalam text beside each word.
  const [fontsLoaded, fontError] = useFonts({
    Quicksand_500Medium,
    Quicksand_700Bold,
    BalooChettan2_500Medium,
    BalooChettan2_700Bold,
  })

  // Branded intro overlay. Component state means it plays once per cold
  // start (fresh process launch) — backgrounding the app does not replay it.
  // Tapping the intro skips straight to Home.
  const [showIntro, setShowIntro] = useState(true)

  // Kick off the ads SDK once per launch, off the critical path — the intro
  // plays regardless of whether initialisation succeeds.
  useEffect(() => {
    initialiseAds()
    initialiseFeedback()
  }, [])

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // The intro's first frame (EnJoy yellow) is rendered before the native
      // splash hides, so the handoff is seamless.
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <GameProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
        {showIntro && <IntroSequence onDone={() => setShowIntro(false)} />}
      </GameProvider>
    </SafeAreaProvider>
  )
}

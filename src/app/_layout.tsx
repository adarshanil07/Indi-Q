import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  BalooChettan2_500Medium,
  BalooChettan2_700Bold,
} from '@expo-google-fonts/baloo-chettan-2'
import { useFonts, Quicksand_700Bold } from '@expo-google-fonts/quicksand'
import * as SplashScreen from 'expo-splash-screen'
import { GameProvider } from '@/store/GameContext'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Quicksand: rounded geometric Latin closely matching the physical card's
  // lettering. Baloo Chettan 2: Malayalam-script companion for the grey
  // Malayalam text beside each word.
  const [fontsLoaded, fontError] = useFonts({
    Quicksand_700Bold,
    BalooChettan2_500Medium,
    BalooChettan2_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <GameProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </GameProvider>
    </SafeAreaProvider>
  )
}

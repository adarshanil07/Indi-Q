import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GameProvider } from '@/store/GameContext'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </GameProvider>
    </SafeAreaProvider>
  )
}

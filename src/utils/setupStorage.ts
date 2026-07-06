// =============================================================================
// utils/setupStorage.ts
// Persists Game Setup choices between sessions (Section 5: "The setup options
// should be remembered and kept the same from game to game unless manually
// altered by the user.")
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ChakraReward } from '../types/game'

const STORAGE_KEY = 'indiq.setup.v1'

/** Everything the Setup screen needs to restore itself exactly as last used. */
export interface SavedSetup {
  teamCount: number
  teamNames: string[]
  timerDuration: number
  maxActiveCards: number
  boardMode: boolean
  targetScoreText: string
  chakraCardCount: number
  chakraReward: ChakraReward
}

export async function loadSavedSetup(): Promise<SavedSetup | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedSetup
  } catch {
    // Corrupt or unreadable — treat as no saved setup rather than crashing.
    return null
  }
}

export async function saveSetup(setup: SavedSetup): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(setup))
  } catch {
    // Persistence is best-effort; the game must start even if saving fails.
  }
}

// =============================================================================
// utils/setupStorage.ts
// Persists Game Setup choices between sessions (Section 5: "The setup options
// should be remembered and kept the same from game to game unless manually
// altered by the user.")
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage'
import { skipsForMaxActiveCards } from '../constants/gameRules'
import type { ChakraReward } from '../types/game'

const STORAGE_KEY = 'indiq.setup.v1'

/** Everything the Setup screen needs to restore itself exactly as last used. */
export interface SavedSetup {
  teamCount: number
  teamNames: string[]
  timerDuration: number
  /** What the player chose under "Skips", not the cards-on-screen allowance. */
  skipsAllowed: number
  boardMode: boolean
  targetScoreText: string
  chakraCardCount: number
  chakraReward: ChakraReward
}

/** Shape written before the setting stored skips rather than cards on screen. */
interface LegacySavedSetup extends Omit<SavedSetup, 'skipsAllowed'> {
  maxActiveCards?: number
}

export async function loadSavedSetup(): Promise<SavedSetup | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedSetup> & LegacySavedSetup

    // Migrate setups saved when this field held the cards-on-screen allowance.
    // Those players picked a number believing it was skips, so converting the
    // stored value restores the setting they actually intended.
    const skipsAllowed =
      parsed.skipsAllowed ??
      (parsed.maxActiveCards !== undefined
        ? skipsForMaxActiveCards(parsed.maxActiveCards)
        : 1)

    return { ...(parsed as SavedSetup), skipsAllowed }
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

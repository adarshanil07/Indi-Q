// =============================================================================
// utils/prefs.ts
// Small persisted user preferences (distinct from game-setup options).
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage'

/** Which language is shown as the card's main text. */
export type CardLanguage = 'en' | 'ml'

const LANGUAGE_KEY = 'indiq.cardLanguage.v1'

export async function loadCardLanguage(): Promise<CardLanguage | null> {
  try {
    const v = await AsyncStorage.getItem(LANGUAGE_KEY)
    return v === 'en' || v === 'ml' ? v : null
  } catch {
    return null
  }
}

export async function saveCardLanguage(lang: CardLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang)
  } catch {
    // Best-effort: losing the preference is harmless.
  }
}

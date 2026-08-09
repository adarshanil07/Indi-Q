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

/** Whether sound effects and vibration are enabled. Both default to on. */
export interface FeedbackPrefs {
  sound: boolean
  haptics: boolean
}

const FEEDBACK_KEY = 'indiq.feedback.v1'

export const DEFAULT_FEEDBACK_PREFS: FeedbackPrefs = { sound: true, haptics: true }

export async function loadFeedbackPrefs(): Promise<FeedbackPrefs> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY)
    if (!raw) return DEFAULT_FEEDBACK_PREFS
    const parsed = JSON.parse(raw) as Partial<FeedbackPrefs>
    return {
      sound: parsed.sound ?? DEFAULT_FEEDBACK_PREFS.sound,
      haptics: parsed.haptics ?? DEFAULT_FEEDBACK_PREFS.haptics,
    }
  } catch {
    return DEFAULT_FEEDBACK_PREFS
  }
}

export async function saveFeedbackPrefs(prefs: FeedbackPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(prefs))
  } catch {
    // Best-effort: losing the preference is harmless.
  }
}

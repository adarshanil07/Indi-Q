// =============================================================================
// feedback/index.ts
// The only place the app touches haptics or audio.
//
// Screens call semantic events — feedback.correct(), feedback.skip() — never
// "play this file" or "buzz this pattern". That keeps the mapping from game
// moment to sensation in one table below, so retuning the feel of the game
// never means touching a screen.
//
// Deliberately NOT applied to every tappable thing. Feedback on every button
// reads as noise; it is reserved for moments that carry meaning — scoring,
// skipping, voiding, revealing, choosing a category, starting and ending a
// turn, and winning.
//
// Every call is fire-and-forget and failure-tolerant: feedback is a garnish,
// and must never interrupt play or reject a promise into the UI.
// =============================================================================

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import * as Haptics from 'expo-haptics'

import { loadFeedbackPrefs, type FeedbackPrefs } from '../utils/prefs'

/** Sounds are tiny (< 20KB) and preloaded once, so playback has no latency. */
const SOURCES = {
  tap: require('@/assets/sfx/tap.wav'),
  correct: require('@/assets/sfx/correct.wav'),
  skip: require('@/assets/sfx/skip.wav'),
  void: require('@/assets/sfx/void.wav'),
} as const

type SoundName = keyof typeof SOURCES

// ── Preferences ─────────────────────────────────────────────────────────────
// Held in module scope rather than context: feedback fires from event handlers
// all over the app, and threading a provider through every screen to read two
// booleans would be far more machinery than the feature deserves.

let prefs: FeedbackPrefs = { sound: true, haptics: true }
const listeners = new Set<() => void>()

/** Load persisted preferences and prepare audio. Called once from the layout. */
export async function initialiseFeedback(): Promise<void> {
  try {
    prefs = await loadFeedbackPrefs()
    listeners.forEach(l => l())
  } catch {
    // Keep the defaults; both on is the expected out-of-the-box behaviour.
  }
  try {
    // playsInSilentMode: false is the whole point of the silent switch —
    // muting the phone must mute the game's UI sounds. shouldPlayInBackground
    // is off because these are momentary UI blips, not media.
    await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false })
  } catch {
    // Audio session unavailable — sounds simply will not play.
  }
}

export function getFeedbackPrefs(): FeedbackPrefs {
  return prefs
}

/** Apply a preference change immediately; persistence is the caller's job. */
export function setFeedbackPrefs(next: FeedbackPrefs): void {
  prefs = next
  listeners.forEach(l => l())
}

export function subscribeFeedbackPrefs(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// ── Audio ───────────────────────────────────────────────────────────────────

const players = new Map<SoundName, AudioPlayer>()

function play(name: SoundName): void {
  if (!prefs.sound) return
  try {
    let player = players.get(name)
    if (!player) {
      player = createAudioPlayer(SOURCES[name])
      players.set(name, player)
    }
    // Rewind first: taps can land faster than a clip finishes, and a player
    // parked at the end would otherwise stay silent.
    player.seekTo(0)
    player.play()
  } catch {
    // A sound failing to play is never worth surfacing.
  }
}

// ── Haptics ─────────────────────────────────────────────────────────────────

function impact(style: Haptics.ImpactFeedbackStyle): void {
  if (!prefs.haptics) return
  void Haptics.impactAsync(style).catch(() => {})
}

function notify(type: Haptics.NotificationFeedbackType): void {
  if (!prefs.haptics) return
  void Haptics.notificationAsync(type).catch(() => {})
}

function selection(): void {
  if (!prefs.haptics) return
  void Haptics.selectionAsync().catch(() => {})
}

// ── The mapping from game moment to sensation ───────────────────────────────
// One table, one place to retune the feel of the whole game.

export const feedback = {
  /** A meaningful button: Start Turn, End Turn, confirming a dialog. */
  tap(): void {
    impact(Haptics.ImpactFeedbackStyle.Light)
    play('tap')
  },

  /** Choosing between options: a category, the card language. */
  select(): void {
    selection()
    play('tap')
  },

  /** Turning the top card face-up — the moment the turn really begins. */
  reveal(): void {
    impact(Haptics.ImpactFeedbackStyle.Medium)
    play('tap')
  },

  /** A word guessed correctly. The one moment that should feel rewarding. */
  correct(): void {
    notify(Haptics.NotificationFeedbackType.Success)
    play('correct')
  },

  /** Skipping a card, or taking back a mis-tapped Correct. */
  skip(): void {
    impact(Haptics.ImpactFeedbackStyle.Light)
    play('skip')
  },

  /** The describer said the word aloud — a mistake, and it should feel like one. */
  voided(): void {
    notify(Haptics.NotificationFeedbackType.Warning)
    play('void')
  },

  /** Winning a Chakra round, or the game ending. */
  win(): void {
    notify(Haptics.NotificationFeedbackType.Success)
    play('correct')
  },
}

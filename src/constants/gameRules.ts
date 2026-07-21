// =============================================================================
// constants/gameRules.ts
// Rule-related runtime constants shared across setup, reducer, and UI.
// =============================================================================

/**
 * Sentinel for "unlimited skips" stored in GameConfig.maxActiveCards.
 * A plain large number keeps every existing comparison and JSON persistence
 * working unchanged (Infinity does not survive JSON.stringify). No turn can
 * ever approach this many active cards.
 */
export const UNLIMITED_SKIPS = 999

export function isUnlimitedSkips(maxActiveCards: number): boolean {
  return maxActiveCards >= UNLIMITED_SKIPS
}

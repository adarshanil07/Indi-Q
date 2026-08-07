// =============================================================================
// constants/gameRules.ts
// Rule-related runtime constants shared across setup, reducer, and UI.
// =============================================================================

/**
 * Sentinel for "unlimited skips". A plain large number keeps every comparison
 * and JSON persistence working (Infinity does not survive JSON.stringify). No
 * turn can ever approach this many skips or active cards.
 */
export const UNLIMITED_SKIPS = 999

export function isUnlimitedSkips(value: number): boolean {
  return value >= UNLIMITED_SKIPS
}

// ── Skips vs cards on screen ────────────────────────────────────────────────
// Players choose how many SKIPS they get; the reducer enforces how many cards
// may sit on screen at once. Skipping keeps the old card and deals another
// alongside it, so the card allowance is always one MORE than the skip
// allowance: 1 skip means 2 cards can be on screen.
//
// These two functions are the only place that relationship is expressed.
// Setting them equal is what previously made the picker off by one — "1 skip"
// allowed only one card on screen, and therefore no skip at all.

/** Cards allowed on screen for a given skip allowance. */
export function maxActiveCardsForSkips(skipsAllowed: number): number {
  return isUnlimitedSkips(skipsAllowed) ? UNLIMITED_SKIPS : skipsAllowed + 1
}

/** Inverse of maxActiveCardsForSkips, for migrating older saved setups. */
export function skipsForMaxActiveCards(maxActiveCards: number): number {
  return isUnlimitedSkips(maxActiveCards) ? UNLIMITED_SKIPS : Math.max(1, maxActiveCards - 1)
}

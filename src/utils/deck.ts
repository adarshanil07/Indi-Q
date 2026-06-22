// =============================================================================
// utils/deck.ts
// Pure functions for managing the card deck and usage tracking.
//
// "Pure" means: no side effects, no React, no global state.
// Every function takes inputs and returns outputs — nothing else.
// This makes them trivially easy to unit test.
// =============================================================================

import type { Card, Category, CardUsageMap } from '../types/game'
import { CATEGORIES } from '../constants/categories'

/**
 * Fisher-Yates shuffle.
 * Returns a NEW shuffled array — the original is never mutated.
 */
export function shuffle<T>(array: readonly T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Standard draw: removes the top card from the deck.
 * Returns [drawnCard, remainingDeck].
 *
 * Use this in no-board mode, where the category is chosen AFTER the card
 * is revealed — so we can't pre-filter by category at draw time.
 */
export function drawCard(deck: Card[]): [Card, Card[]] {
  if (deck.length === 0) {
    throw new Error('drawCard: cannot draw from an empty deck.')
  }
  const [card, ...rest] = deck
  return [card, rest]
}

/**
 * Smart draw: picks a card that still has a fresh word for the given category.
 * Used in board mode, where the category is known before the card is drawn.
 *
 * Algorithm:
 *   1. Find cards in the deck whose `category` has NOT been used yet
 *      (i.e. not in cardUsage[card.id]).
 *   2. If any found → pick one at random from that preferred set.
 *   3. If none found (every deck card has already used this category) →
 *      fall back to a random card from the full deck.
 *      The word will be a repeat, but it's the best available option.
 *
 * Returns [chosenCard, remainingDeck].
 */
export function drawCardForCategory(
  deck: Card[],
  cardUsage: CardUsageMap,
  category: Category,
): [Card, Card[]] {
  if (deck.length === 0) {
    throw new Error('drawCardForCategory: cannot draw from an empty deck.')
  }

  const preferred = deck.filter(
    card => !(cardUsage[card.id] ?? []).includes(category),
  )

  const pool = preferred.length > 0 ? preferred : deck
  const chosen = pool[Math.floor(Math.random() * pool.length)]
  const remaining = deck.filter(card => card.id !== chosen.id)

  return [chosen, remaining]
}

/**
 * Draw n cards at once (used when starting Chakra Mode).
 * Standard draw — category is not known in advance.
 * Returns [drawnCards, remainingDeck].
 */
export function drawCards(deck: Card[], n: number): [Card[], Card[]] {
  if (deck.length < n) {
    throw new Error(`drawCards: requested ${n} cards but deck only has ${deck.length}.`)
  }
  return [deck.slice(0, n), deck.slice(n)]
}

/**
 * Record that a category was played on a card.
 * Returns a new CardUsageMap — does not mutate the original.
 *
 * Call this at the end of every turn, once the category and card are confirmed.
 */
export function recordCardUsage(
  usageMap: CardUsageMap,
  cardId: string,
  category: Category,
): CardUsageMap {
  const existing = usageMap[cardId] ?? []
  // Avoid duplicates (e.g. if the same card is played twice in edge cases)
  if (existing.includes(category)) return usageMap
  return { ...usageMap, [cardId]: [...existing, category] }
}

/**
 * Refill the deck from the discard pile when the deck runs out.
 *
 * Also resets usage tracking for cards where all 6 categories have been played —
 * making them fully fresh for the next cycle. Cards with remaining unused
 * categories keep their usage record so smart draws still avoid repeats.
 *
 * Returns { deck, discardPile, cardUsage } — all three may change.
 */
export function refillDeck(
  discardPile: Card[],
  cardUsage: CardUsageMap,
): { deck: Card[]; discardPile: Card[]; cardUsage: CardUsageMap } {
  const totalCategories = CATEGORIES.length  // 6

  // Remove usage entries for fully exhausted cards so they are fresh again
  const updatedUsage: CardUsageMap = {}
  for (const [cardId, usedCategories] of Object.entries(cardUsage)) {
    if (usedCategories.length < totalCategories) {
      updatedUsage[cardId] = usedCategories  // still has unused words — keep tracking
    }
    // If all 6 categories are used, entry is omitted → card resets to fully fresh
  }

  return {
    deck: shuffle(discardPile),
    discardPile: [],
    cardUsage: updatedUsage,
  }
}

// =============================================================================
// utils/deck.ts
// Word-freshness card selection. Pure functions only: no side effects, no
// React, no global state, so every behaviour is unit-testable.
//
// The model
// ---------
//   deck        cards never shown this game. It drains and is never refilled.
//   discardPile cards that have been shown, in the order they finished being
//               used — so the FRONT is the least-recently-seen card.
//   cardUsage   which categories each card has spent. A word is "fresh" while
//               its category is not recorded for that card.
//
// Every draw states a Need — a specific category, the card's own ☸ word, or
// 'any' — and selection walks three tiers:
//
//   1. UNSEEN        front-most deck card whose needed word is fresh.
//   2. SEEN, FRESH   front-most discard card whose needed word is fresh.
//                    The same card can return, as long as the word for the
//                    current need has not been used.
//   3. EXHAUSTED     every candidate's needed word is spent: front-most
//                    discard card — i.e. the least-recently-seen repeat.
//                    Play never stops for lack of fresh words.
//
// Cards currently on screen are excluded via `excludeIds`; the linear deck
// used to prevent on-screen duplicates for free, so pool-based selection has
// to do it explicitly.
//
// Selection is deterministic (front-most, never random). All randomness lives
// in the single shuffle when the game starts, which keeps games varied while
// making every draw reproducible in tests.
// =============================================================================

import type { Card, Category, CardUsageMap } from '../types/game'

/** What the next card must provide. */
export type Need =
  | { kind: 'category'; category: Category }
  | { kind: 'chakra' }
  | { kind: 'any' }

/** The word (category slot) a need consumes on a given card, if any. */
function neededCategory(card: Card, need: Need): Category | null {
  switch (need.kind) {
    case 'category':
      return need.category
    case 'chakra':
      return card.chakraCategory
    case 'any':
      return null
  }
}

/** True while the card's word for this need has not been used. */
export function isFreshFor(card: Card, need: Need, cardUsage: CardUsageMap): boolean {
  const category = neededCategory(card, need)
  if (category === null) return true
  return !(cardUsage[card.id] ?? []).includes(category)
}

export interface TakeResult {
  card: Card
  /** False only when the tier-3 fallback served an already-used word. */
  fresh: boolean
  deck: Card[]
  discardPile: Card[]
}

/**
 * Select one card for a need, removing it from whichever pile held it.
 * Returns null when every card is excluded (i.e. everything is on screen) —
 * with a real deck that only happens in degenerate tests.
 */
export function takeCard(
  deck: Card[],
  discardPile: Card[],
  cardUsage: CardUsageMap,
  need: Need,
  excludeIds: ReadonlySet<string> = new Set(),
): TakeResult | null {
  const allowed = (card: Card) => !excludeIds.has(card.id)

  // Tier 1: unseen and fresh.
  const fromDeck = deck.find(card => allowed(card) && isFreshFor(card, need, cardUsage))
  if (fromDeck) {
    return {
      card: fromDeck,
      fresh: true,
      deck: deck.filter(c => c.id !== fromDeck.id),
      discardPile,
    }
  }

  // Tier 2: seen, but the needed word is still fresh. Front of the discard
  // pile first, so the least-recently-seen eligible card returns.
  const fromDiscard = discardPile.find(
    card => allowed(card) && isFreshFor(card, need, cardUsage),
  )
  if (fromDiscard) {
    return {
      card: fromDiscard,
      fresh: true,
      deck,
      discardPile: discardPile.filter(c => c.id !== fromDiscard.id),
    }
  }

  // Tier 3: the need is exhausted — serve the oldest repeat rather than stop
  // play. Unseen deck cards are always fresh, so exhaustion implies the deck
  // holds no allowed cards either; still check it for completeness.
  const fallback = discardPile.find(allowed) ?? deck.find(allowed)
  if (!fallback) return null
  return {
    card: fallback,
    fresh: false,
    deck: deck.filter(c => c.id !== fallback.id),
    discardPile: discardPile.filter(c => c.id !== fallback.id),
  }
}

/**
 * Select up to `count` cards for a need (the Chakra round's candidate hand).
 * Fresh ☸ words fill the slots first; least-recently-seen repeats pad the
 * rest, so the round always offers a full hand when enough cards exist.
 */
export function takeCards(
  deck: Card[],
  discardPile: Card[],
  cardUsage: CardUsageMap,
  need: Need,
  count: number,
  excludeIds: ReadonlySet<string> = new Set(),
): { cards: Card[]; deck: Card[]; discardPile: Card[] } {
  const cards: Card[] = []
  let d = deck
  let p = discardPile
  const excluded = new Set(excludeIds)
  for (let i = 0; i < count; i++) {
    const taken = takeCard(d, p, cardUsage, need, excluded)
    if (!taken) break
    cards.push(taken.card)
    excluded.add(taken.card.id)
    d = taken.deck
    p = taken.discardPile
  }
  return { cards, deck: d, discardPile: p }
}

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
 * Record that a category was played on a card.
 * Returns a new CardUsageMap — does not mutate the original.
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

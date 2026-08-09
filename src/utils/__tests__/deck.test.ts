import { isFreshFor, recordCardUsage, shuffle, takeCard, takeCards } from '../deck'
import { makeCard, makeDeck } from '../../testUtils/factories'
import type { Card } from '../../types/game'

const noUsage = {}

describe('shuffle', () => {
  it('returns a permutation without mutating the original', () => {
    const deck = makeDeck(20)
    const copy = [...deck]
    const shuffled = shuffle(deck)
    expect(deck).toEqual(copy)
    expect([...shuffled].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...deck].sort((a, b) => a.id.localeCompare(b.id)),
    )
  })
})

describe('recordCardUsage', () => {
  it('records a category once, immutably', () => {
    const first = recordCardUsage(noUsage, 'c1', 'People')
    const second = recordCardUsage(first, 'c1', 'People')
    expect(first['c1']).toEqual(['People'])
    expect(second).toBe(first)
    expect(noUsage).toEqual({})
  })
})

describe('takeCard tiers', () => {
  const need = { kind: 'category', category: 'People' } as const

  it('tier 1: prefers the front-most unseen deck card', () => {
    const deck = makeDeck(3)
    const discard = [makeCard('seen1')]
    const result = takeCard(deck, discard, noUsage, need)!
    expect(result.card.id).toBe('c1')
    expect(result.fresh).toBe(true)
    expect(result.deck.map(c => c.id)).toEqual(['c2', 'c3'])
    expect(result.discardPile).toBe(discard)
  })

  it('tier 1 skips deck cards whose needed word is spent', () => {
    const deck = makeDeck(2)
    const usage = recordCardUsage(noUsage, 'c1', 'People')
    const result = takeCard(deck, [], usage, need)!
    expect(result.card.id).toBe('c2')
    expect(result.fresh).toBe(true)
  })

  it('tier 2: reuses the least-recently-seen discard card whose word is fresh', () => {
    // Deck empty; both discard cards seen, but only older's People word is fresh.
    const older = makeCard('older')
    const newer = makeCard('newer')
    const usage = recordCardUsage(noUsage, 'older', 'Movie') // People still fresh
    const result = takeCard([], [older, newer], usage, need)!
    expect(result.card.id).toBe('older')
    expect(result.fresh).toBe(true)
    expect(result.discardPile.map(c => c.id)).toEqual(['newer'])
  })

  it('tier 3: exhaustion serves the oldest repeat and reports fresh: false', () => {
    const a = makeCard('a')
    const b = makeCard('b')
    let usage = recordCardUsage(noUsage, 'a', 'People')
    usage = recordCardUsage(usage, 'b', 'People')
    const result = takeCard([], [a, b], usage, need)!
    expect(result.card.id).toBe('a') // front of discard = least recently seen
    expect(result.fresh).toBe(false)
  })

  it('never selects an excluded (on-screen) card', () => {
    const deck = makeDeck(2)
    const result = takeCard(deck, [], noUsage, need, new Set(['c1']))!
    expect(result.card.id).toBe('c2')
  })

  it('returns null only when everything is excluded', () => {
    const deck = makeDeck(1)
    expect(takeCard(deck, [], noUsage, need, new Set(['c1']))).toBeNull()
  })

  it("need 'chakra' is judged against each card's own ☸ word", () => {
    const spadePeople: Card = makeCard('sp', 'People')
    const spadeMovie: Card = makeCard('sm', 'Movie')
    const usage = recordCardUsage(noUsage, 'sp', 'People') // sp's ☸ word spent
    const result = takeCard([spadePeople, spadeMovie], [], usage, { kind: 'chakra' })!
    expect(result.card.id).toBe('sm')
  })

  it("need 'any' treats every card as fresh", () => {
    const usage = recordCardUsage(noUsage, 'c1', 'People')
    const result = takeCard(makeDeck(1), [], usage, { kind: 'any' })!
    expect(result.card.id).toBe('c1')
    expect(result.fresh).toBe(true)
  })
})

describe('takeCards (chakra hand)', () => {
  it('fills with fresh-☸ cards first, then pads with the oldest repeats', () => {
    // Three cards, two with spent ☸ words: hand of 3 = 1 fresh + 2 repeats,
    // repeats in least-recently-seen order.
    const fresh = makeCard('fresh', 'People')
    const oldSpent = makeCard('oldSpent', 'People')
    const newSpent = makeCard('newSpent', 'People')
    let usage = recordCardUsage({}, 'oldSpent', 'People')
    usage = recordCardUsage(usage, 'newSpent', 'People')

    const { cards } = takeCards([fresh], [oldSpent, newSpent], usage, { kind: 'chakra' }, 3)
    expect(cards.map(c => c.id)).toEqual(['fresh', 'oldSpent', 'newSpent'])
  })

  it('never deals the same card twice into one hand', () => {
    const { cards } = takeCards(makeDeck(2), [], {}, { kind: 'chakra' }, 5)
    expect(cards).toHaveLength(2)
    expect(new Set(cards.map(c => c.id)).size).toBe(2)
  })
})

describe('isFreshFor', () => {
  it('matches usage per category', () => {
    const card = makeCard('c1', 'Movie')
    const usage = recordCardUsage({}, 'c1', 'People')
    expect(isFreshFor(card, { kind: 'category', category: 'People' }, usage)).toBe(false)
    expect(isFreshFor(card, { kind: 'category', category: 'Nature' }, usage)).toBe(true)
    expect(isFreshFor(card, { kind: 'chakra' }, usage)).toBe(true) // ☸ = Movie
  })
})

// =============================================================================
// utils/__tests__/deck.test.ts
// Deck management: shuffle, draws, usage tracking, refill cycling.
// =============================================================================

import {
  shuffle,
  drawCard,
  drawCardForCategory,
  drawCards,
  recordCardUsage,
  refillDeck,
} from '../deck'
import type { CardUsageMap } from '../../types/game'
import { CATEGORIES } from '../../constants/categories'
import { makeCard, makeCards } from '../../test-utils/fixtures'

describe('shuffle', () => {
  it('returns a new array and never mutates the input', () => {
    const original = [1, 2, 3, 4, 5]
    const copy = [...original]
    const result = shuffle(original)
    expect(original).toEqual(copy)
    expect(result).not.toBe(original)
  })

  it('preserves length and elements (is a permutation)', () => {
    const input = makeCards(30)
    const result = shuffle(input)
    expect(result).toHaveLength(30)
    expect(new Set(result.map(c => c.id))).toEqual(new Set(input.map(c => c.id)))
  })

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle([42])).toEqual([42])
  })

  it('produces a uniform-ish distribution (Fisher-Yates sanity check)', () => {
    // With 3 elements over many runs, each element should land in each
    // position roughly 1/3 of the time. A biased shuffle (e.g. sort-random)
    // fails this badly.
    const runs = 3000
    const counts: Record<string, number> = {}
    for (let i = 0; i < runs; i++) {
      const [first] = shuffle(['a', 'b', 'c'])
      counts[first] = (counts[first] ?? 0) + 1
    }
    for (const letter of ['a', 'b', 'c']) {
      expect(counts[letter]).toBeGreaterThan(runs / 3 - runs * 0.1)
      expect(counts[letter]).toBeLessThan(runs / 3 + runs * 0.1)
    }
  })

  it('respects Math.random for ordering (deterministic under mock)', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0)
    try {
      // j is always 0: [1,2,3] → swap i=2 with 0 → [3,2,1] → swap i=1 with 0 → [2,3,1]
      expect(shuffle([1, 2, 3])).toEqual([2, 3, 1])
    } finally {
      spy.mockRestore()
    }
  })
})

describe('drawCard', () => {
  it('returns the top card and the remaining deck', () => {
    const deck = makeCards(3)
    const [card, rest] = drawCard(deck)
    expect(card.id).toBe('c1')
    expect(rest.map(c => c.id)).toEqual(['c2', 'c3'])
  })

  it('does not mutate the original deck', () => {
    const deck = makeCards(3)
    drawCard(deck)
    expect(deck).toHaveLength(3)
  })

  it('empties the deck on the last draw', () => {
    const [card, rest] = drawCard(makeCards(1))
    expect(card.id).toBe('c1')
    expect(rest).toEqual([])
  })

  it('throws on an empty deck', () => {
    expect(() => drawCard([])).toThrow('drawCard: cannot draw from an empty deck.')
  })
})

describe('drawCardForCategory', () => {
  it('prefers a card whose category is unused', () => {
    const deck = makeCards(3)
    const usage: CardUsageMap = {
      c1: ['Movie'],
      c2: ['Movie'],
      // c3 has never used Movie
    }
    const [card, rest] = drawCardForCategory(deck, usage, 'Movie')
    expect(card.id).toBe('c3')
    expect(rest.map(c => c.id)).toEqual(['c1', 'c2'])
  })

  it('picks randomly among multiple fresh candidates', () => {
    const deck = makeCards(3)
    const usage: CardUsageMap = { c1: ['People'] }
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const [card] = drawCardForCategory(deck, usage, 'People')
      seen.add(card.id)
    }
    // c2 and c3 are both fresh for People — both should appear over many draws
    expect(seen.has('c2')).toBe(true)
    expect(seen.has('c3')).toBe(true)
    expect(seen.has('c1')).toBe(false)
  })

  it('falls back to the full deck when every card has used the category', () => {
    const deck = makeCards(2)
    const usage: CardUsageMap = { c1: ['Nature'], c2: ['Nature'] }
    const [card, rest] = drawCardForCategory(deck, usage, 'Nature')
    expect(['c1', 'c2']).toContain(card.id)
    expect(rest).toHaveLength(1)
    expect(rest[0].id).not.toBe(card.id)
  })

  it('treats cards missing from the usage map as fresh', () => {
    const deck = makeCards(1)
    const [card] = drawCardForCategory(deck, {}, 'Object')
    expect(card.id).toBe('c1')
  })

  it('removes exactly the chosen card from the deck', () => {
    const deck = makeCards(5)
    const [card, rest] = drawCardForCategory(deck, {}, 'Random')
    expect(rest).toHaveLength(4)
    expect(rest.find(c => c.id === card.id)).toBeUndefined()
  })

  it('throws on an empty deck', () => {
    expect(() => drawCardForCategory([], {}, 'Movie')).toThrow(
      'drawCardForCategory: cannot draw from an empty deck.',
    )
  })
})

describe('drawCards', () => {
  it('draws n cards from the top in order', () => {
    const deck = makeCards(5)
    const [drawn, rest] = drawCards(deck, 3)
    expect(drawn.map(c => c.id)).toEqual(['c1', 'c2', 'c3'])
    expect(rest.map(c => c.id)).toEqual(['c4', 'c5'])
  })

  it('can drain the whole deck', () => {
    const deck = makeCards(3)
    const [drawn, rest] = drawCards(deck, 3)
    expect(drawn).toHaveLength(3)
    expect(rest).toEqual([])
  })

  it('drawing zero cards is a no-op', () => {
    const deck = makeCards(2)
    const [drawn, rest] = drawCards(deck, 0)
    expect(drawn).toEqual([])
    expect(rest).toHaveLength(2)
  })

  it('throws when asking for more cards than the deck holds', () => {
    expect(() => drawCards(makeCards(2), 3)).toThrow(
      'drawCards: requested 3 cards but deck only has 2.',
    )
  })
})

describe('recordCardUsage', () => {
  it('adds a category for a card not yet tracked', () => {
    const result = recordCardUsage({}, 'c1', 'Movie')
    expect(result).toEqual({ c1: ['Movie'] })
  })

  it('appends a new category to an existing entry', () => {
    const result = recordCardUsage({ c1: ['Movie'] }, 'c1', 'Nature')
    expect(result.c1).toEqual(['Movie', 'Nature'])
  })

  it('returns the same map unchanged when the category is a duplicate', () => {
    const usage: CardUsageMap = { c1: ['Movie'] }
    const result = recordCardUsage(usage, 'c1', 'Movie')
    expect(result).toBe(usage)
  })

  it('does not mutate the original map or its arrays', () => {
    const usage: CardUsageMap = { c1: ['Movie'] }
    recordCardUsage(usage, 'c1', 'Nature')
    expect(usage).toEqual({ c1: ['Movie'] })
  })

  it('keeps other cards untouched', () => {
    const usage: CardUsageMap = { c1: ['Movie'], c2: ['People'] }
    const result = recordCardUsage(usage, 'c1', 'Object')
    expect(result.c2).toEqual(['People'])
  })
})

describe('refillDeck', () => {
  it('moves all discard cards into a new deck and empties the discard', () => {
    const discard = makeCards(4)
    const { deck, discardPile } = refillDeck(discard, {})
    expect(deck).toHaveLength(4)
    expect(new Set(deck.map(c => c.id))).toEqual(new Set(['c1', 'c2', 'c3', 'c4']))
    expect(discardPile).toEqual([])
  })

  it('shuffles the refilled deck (does not just copy discard order)', () => {
    const discard = makeCards(20)
    // With 20 cards, the odds of a shuffle preserving order across 5 attempts
    // are astronomically small — flakiness is not a realistic concern.
    let reordered = false
    for (let i = 0; i < 5; i++) {
      const { deck } = refillDeck(discard, {})
      if (deck.map(c => c.id).join() !== discard.map(c => c.id).join()) {
        reordered = true
        break
      }
    }
    expect(reordered).toBe(true)
  })

  it('resets usage for cards with all 6 categories used', () => {
    const fullUsage = [...CATEGORIES]
    const { cardUsage } = refillDeck(makeCards(2), {
      c1: fullUsage,
      c2: ['Movie'],
    })
    expect(cardUsage.c1).toBeUndefined() // exhausted → fresh again
    expect(cardUsage.c2).toEqual(['Movie']) // partial → kept
  })

  it('keeps usage entries with 5 of 6 categories', () => {
    const fiveUsed = CATEGORIES.slice(0, 5)
    const { cardUsage } = refillDeck(makeCards(1), { c1: [...fiveUsed] })
    expect(cardUsage.c1).toEqual(fiveUsed)
  })

  it('handles an empty discard pile', () => {
    const { deck, discardPile, cardUsage } = refillDeck([], { c1: ['Movie'] })
    expect(deck).toEqual([])
    expect(discardPile).toEqual([])
    expect(cardUsage).toEqual({ c1: ['Movie'] })
  })

  it('does not mutate the input usage map', () => {
    const usage: CardUsageMap = { c1: [...CATEGORIES] }
    refillDeck(makeCards(1), usage)
    expect(usage.c1).toHaveLength(6)
  })
})

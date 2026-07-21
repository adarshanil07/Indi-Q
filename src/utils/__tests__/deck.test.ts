import { shuffle, drawCard, drawCardForCategory, drawCards, recordCardUsage, refillDeck } from '../deck'
import { CATEGORIES } from '../../constants/categories'
import { makeCard, makeDeck } from '../../testUtils/factories'

describe('shuffle', () => {
  it('returns a new array with the same elements', () => {
    const original = makeDeck(20)
    const result = shuffle(original)
    expect(result).not.toBe(original)
    expect(result).toHaveLength(20)
    expect(new Set(result.map(c => c.id))).toEqual(new Set(original.map(c => c.id)))
  })

  it('does not mutate the input', () => {
    const original = makeDeck(10)
    const snapshot = [...original]
    shuffle(original)
    expect(original).toEqual(snapshot)
  })

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle([1])).toEqual([1])
  })
})

describe('drawCard', () => {
  it('returns the top card and the rest of the deck', () => {
    const deck = makeDeck(3)
    const [card, rest] = drawCard(deck)
    expect(card.id).toBe('c1')
    expect(rest.map(c => c.id)).toEqual(['c2', 'c3'])
  })

  it('throws on an empty deck', () => {
    expect(() => drawCard([])).toThrow('empty deck')
  })
})

describe('drawCardForCategory', () => {
  it('prefers cards whose category word is unused', () => {
    const deck = [makeCard('used'), makeCard('fresh')]
    const usage = { used: ['People' as const] }
    // Run several times — the choice is random within the preferred pool,
    // but here the pool has exactly one card.
    for (let i = 0; i < 10; i++) {
      const [card] = drawCardForCategory(deck, usage, 'People')
      expect(card.id).toBe('fresh')
    }
  })

  it('falls back to the full deck when every card has used the category', () => {
    const deck = [makeCard('a'), makeCard('b')]
    const usage = { a: ['People' as const], b: ['People' as const] }
    const [card, rest] = drawCardForCategory(deck, usage, 'People')
    expect(['a', 'b']).toContain(card.id)
    expect(rest).toHaveLength(1)
  })

  it('throws on an empty deck', () => {
    expect(() => drawCardForCategory([], {}, 'People')).toThrow('empty deck')
  })
})

describe('drawCards', () => {
  it('draws n cards from the top', () => {
    const deck = makeDeck(5)
    const [drawn, rest] = drawCards(deck, 3)
    expect(drawn.map(c => c.id)).toEqual(['c1', 'c2', 'c3'])
    expect(rest.map(c => c.id)).toEqual(['c4', 'c5'])
  })

  it('throws when the deck is too small', () => {
    expect(() => drawCards(makeDeck(2), 3)).toThrow('requested 3')
  })
})

describe('recordCardUsage', () => {
  it('adds a category to a card entry without mutating the original', () => {
    const usage = { c1: ['People' as const] }
    const next = recordCardUsage(usage, 'c1', 'Movie')
    expect(next.c1).toEqual(['People', 'Movie'])
    expect(usage.c1).toEqual(['People'])
  })

  it('creates an entry for a new card', () => {
    expect(recordCardUsage({}, 'c9', 'Nature')).toEqual({ c9: ['Nature'] })
  })

  it('ignores duplicate categories', () => {
    const usage = { c1: ['People' as const] }
    expect(recordCardUsage(usage, 'c1', 'People')).toBe(usage)
  })
})

describe('refillDeck', () => {
  it('moves the discard pile into a shuffled deck and empties the discard', () => {
    const discard = makeDeck(6)
    const { deck, discardPile } = refillDeck(discard, {})
    expect(deck).toHaveLength(6)
    expect(discardPile).toEqual([])
  })

  it('resets usage for fully exhausted cards but keeps partial usage', () => {
    const usage = {
      exhausted: [...CATEGORIES],
      partial: ['People' as const, 'Movie' as const],
    }
    const { cardUsage } = refillDeck(makeDeck(2), usage)
    expect(cardUsage.exhausted).toBeUndefined()
    expect(cardUsage.partial).toEqual(['People', 'Movie'])
  })
})

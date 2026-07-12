// =============================================================================
// data/__tests__/cards.test.ts
// Integrity checks for the card database. A malformed card would crash or
// silently corrupt gameplay, so every card is validated structurally here.
// =============================================================================

import rawCards from '../cards.json'
import type { Card } from '../../types/game'
import { CATEGORIES } from '../../constants/categories'

const cards = rawCards as Card[]

describe('cards.json integrity', () => {
  it('is a non-empty array of cards', () => {
    expect(Array.isArray(cards)).toBe(true)
    expect(cards.length).toBeGreaterThan(0)
  })

  it('every card has a unique, non-empty string id', () => {
    const ids = cards.map(c => c.id)
    for (const id of ids) {
      expect(typeof id).toBe('string')
      expect(id.trim().length).toBeGreaterThan(0)
    }
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every card has a non-empty word for all 6 categories', () => {
    for (const card of cards) {
      for (const category of CATEGORIES) {
        const word = card.words[category]
        expect(typeof word).toBe('string')
        expect(word.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('cards have no extra word keys beyond the 6 categories', () => {
    for (const card of cards) {
      const keys = Object.keys(card.words)
      expect(keys.sort()).toEqual([...CATEGORIES].sort())
    }
  })

  it('every chakraCategory is one of the 6 valid categories', () => {
    for (const card of cards) {
      expect(CATEGORIES).toContain(card.chakraCategory)
    }
  })

  it('wordsMl, when present, covers all 6 categories with non-empty text', () => {
    for (const card of cards) {
      if (!card.wordsMl) continue
      for (const category of CATEGORIES) {
        const ml = card.wordsMl[category]
        expect(typeof ml).toBe('string')
        expect(ml.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('no duplicate words within a single card', () => {
    for (const card of cards) {
      const words = CATEGORIES.map(c => card.words[c].toLowerCase())
      expect(new Set(words).size).toBe(words.length)
    }
  })

  it('chakra words are spread across more than one category (deck variety)', () => {
    const chakraCategories = new Set(cards.map(c => c.chakraCategory))
    expect(chakraCategories.size).toBeGreaterThan(1)
  })
})

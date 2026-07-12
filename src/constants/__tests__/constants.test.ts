// =============================================================================
// constants/__tests__/constants.test.ts
// Guards on runtime constants the game rules and visuals depend on.
// =============================================================================

import { CATEGORIES, CATEGORY_COLOURS } from '../categories'
import { CARD_SVG, CATEGORY_BOX_SVGS } from '../cardSvg'
import { COLOURS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme'
import type { Category } from '../../types/game'

const HEX_COLOUR = /^#[0-9A-Fa-f]{6}$/

describe('CATEGORIES', () => {
  it('contains exactly the 6 categories in canonical display order', () => {
    expect(CATEGORIES).toEqual([
      'People',
      'Location',
      'Object',
      'Movie',
      'Nature',
      'Random',
    ])
  })

  it('has no duplicates', () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length)
  })
})

describe('CATEGORY_COLOURS', () => {
  it('defines a valid hex colour for every category', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_COLOURS[category]).toMatch(HEX_COLOUR)
    }
  })

  it('has no keys beyond the 6 categories', () => {
    expect(Object.keys(CATEGORY_COLOURS).sort()).toEqual([...CATEGORIES].sort())
  })

  it('assigns a distinct colour to each category', () => {
    const values = Object.values(CATEGORY_COLOURS)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('card SVG assets', () => {
  it('CARD_SVG is a well-formed svg string', () => {
    expect(CARD_SVG.trim().startsWith('<svg')).toBe(true)
    expect(CARD_SVG.trim().endsWith('</svg>')).toBe(true)
  })

  it('provides a category box SVG for every category', () => {
    for (const category of CATEGORIES) {
      const svg = CATEGORY_BOX_SVGS[category]
      expect(svg.trim().startsWith('<svg')).toBe(true)
      expect(svg.trim().endsWith('</svg>')).toBe(true)
    }
  })

  it('each category box uses its category colour fill', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_BOX_SVGS[category]).toContain(
        `fill="${CATEGORY_COLOURS[category]}"`,
      )
    }
  })

  it('the full card contains every category colour', () => {
    for (const category of CATEGORIES) {
      expect(CARD_SVG).toContain(CATEGORY_COLOURS[category as Category])
    }
  })
})

describe('theme', () => {
  it('all COLOURS are valid hex values', () => {
    for (const value of Object.values(COLOURS)) {
      expect(value).toMatch(HEX_COLOUR)
    }
  })

  it('SPACING scales monotonically', () => {
    const values = [SPACING.xs, SPACING.sm, SPACING.md, SPACING.lg, SPACING.xl, SPACING.xxl]
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })

  it('FONT_SIZE scales monotonically', () => {
    const values = [FONT_SIZE.sm, FONT_SIZE.md, FONT_SIZE.lg, FONT_SIZE.xl, FONT_SIZE.xxl]
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })

  it('BORDER_RADIUS values are positive', () => {
    for (const value of Object.values(BORDER_RADIUS)) {
      expect(value).toBeGreaterThan(0)
    }
  })
})

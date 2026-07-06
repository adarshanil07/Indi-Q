// =============================================================================
// constants/categories.ts
// Runtime values tied to the Category type.
// Visual and ordering concerns live here, not in types/.
// =============================================================================

import type { Category } from '../types/game'

/**
 * Canonical display order for card rows.
 * Every component that renders category rows should iterate over this —
 * never hardcode the order inline.
 */
export const CATEGORIES: readonly Category[] = [
  'People',
  'Location',
  'Object',
  'Movie',
  'Nature',
  'Random',
] as const

/**
 * Card row background colour for each category.
 * Single source of truth — change a colour here and it updates everywhere.
 */
export const CATEGORY_COLOURS: Record<Category, string> = {
  People:   '#FDE803', // Yellow  — Plain card [Vectorized].svg
  Location: '#8783BC', // Purple  — Plain card [Vectorized].svg
  Object:   '#62B0E0', // Blue    — Plain card [Vectorized].svg
  Movie:    '#F28D1D', // Orange  — Plain card [Vectorized].svg
  Nature:   '#0A9C4E', // Green   — Plain card [Vectorized].svg
  Random:   '#E41D1F', // Red     — Plain card [Vectorized].svg
}

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
  People:   '#F5D000', // Yellow
  Location: '#7B68B5', // Purple
  Object:   '#00AADF', // Blue
  Movie:    '#F58220', // Orange
  Nature:   '#2E8B57', // Green
  Random:   '#D0021B', // Red
}

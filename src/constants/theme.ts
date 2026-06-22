// =============================================================================
// constants/theme.ts
// App-wide visual constants: spacing, typography, colours.
// Import from here in components — never hardcode values inline.
// =============================================================================

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const

export const FONT_SIZE = {
  sm:  14,
  md:  18,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const

export const BORDER_RADIUS = {
  sm:  6,
  md:  12,
  lg:  20,
  full: 9999,
} as const

export const COLOURS = {
  background: '#FFFFFF',
  surface:    '#F5F5F5',
  textPrimary:   '#111111',
  textSecondary: '#555555',
  correct: '#34C759', // green — used for correct answer flash
  skip:    '#FF9500', // orange — used for skip button
  danger:  '#FF3B30', // red — used for timer warning
} as const

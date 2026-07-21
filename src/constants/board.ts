// =============================================================================
// constants/board.ts
// The digital Indi-Q board: a 7-space cycle repeated 7 times plus a FINISH
// space. There is no physical board — this file IS the canonical layout.
//
//   Cycle: Object → Movie → ☸ Chakra → Location → People → Random → Nature
//
// All teams start on space 0. A team's turn category is dictated by the
// space they are ON (Section 8.2); ☸ spaces offer a Chakra round instead,
// or a free category choice if declined.
// =============================================================================

import type { Category } from '../types/game'

export type BoardSpace =
  | { type: 'category'; category: Category }
  | { type: 'chakra' }
  | { type: 'finish' }

const CYCLE: BoardSpace[] = [
  { type: 'category', category: 'Object' },
  { type: 'category', category: 'Movie' },
  { type: 'chakra' },
  { type: 'category', category: 'Location' },
  { type: 'category', category: 'People' },
  { type: 'category', category: 'Random' },
  { type: 'category', category: 'Nature' },
]

const CYCLES = 7

export const BOARD_SPACES: BoardSpace[] = [
  ...Array.from({ length: CYCLES }, () => CYCLE).flat(),
  { type: 'finish' },
]

/** Index of the FINISH space — reaching it wins (after the fairness round). */
export const FINISH_INDEX = BOARD_SPACES.length - 1

export function spaceAt(position: number): BoardSpace {
  return BOARD_SPACES[Math.max(0, Math.min(position, FINISH_INDEX))]
}

/** Category letter codes for the small tiles (P L O M N R per requirements). */
export const CATEGORY_LETTERS: Record<Category, string> = {
  People: 'P',
  Location: 'L',
  Object: 'O',
  Movie: 'M',
  Nature: 'N',
  Random: 'R',
}

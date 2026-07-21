// =============================================================================
// constants/teams.ts
// Team identity colours, dealt from the deck palette in card order.
// A team's colour follows it everywhere: setup fields, score chips, chakra
// team buttons, results leaderboard, and completed-words labels.
// =============================================================================

import { CATEGORY_COLOURS } from './categories'
import type { Team } from '../types/game'

export const TEAM_COLOURS = [
  CATEGORY_COLOURS.People,   // yellow  — Team 1
  CATEGORY_COLOURS.Location, // purple  — Team 2
  CATEGORY_COLOURS.Object,   // blue    — Team 3
  CATEGORY_COLOURS.Movie,    // orange  — Team 4
] as const

/** Colour for the team at a given index (wraps if more teams than colours). */
export function teamColourAt(index: number): string {
  return TEAM_COLOURS[((index % TEAM_COLOURS.length) + TEAM_COLOURS.length) % TEAM_COLOURS.length]
}

/** Colour for a team by id, given the session's team list. */
export function teamColourFor(teams: Team[], teamId: string): string {
  const idx = teams.findIndex(t => t.id === teamId)
  return teamColourAt(idx >= 0 ? idx : 0)
}

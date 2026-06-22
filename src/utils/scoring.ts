// =============================================================================
// utils/scoring.ts
// Pure functions for win conditions and score logic.
//
// Board mode win condition is intentionally not handled here — it lives with
// BoardState logic (Section 8). This file only covers no-board mode and
// shared helpers.
// =============================================================================

import type { GameState, Team } from '../types/game'

/**
 * Check whether the no-board win condition has been met.
 *
 * Returns false when:
 *   - boardMode is on (board has its own win condition)
 *   - targetScore is undefined (players end the game manually)
 *
 * Returns true when any team has reached or exceeded the target score.
 */
export function isGameOver(state: GameState): boolean {
  if (state.config.boardMode) return false
  if (state.config.targetScore === undefined) return false
  return state.teams.some(team => team.score >= state.config.targetScore!)
}

/**
 * Return all teams that have met or exceeded the target score.
 * More than one team = tie; call this after isGameOver returns true.
 */
export function getWinners(teams: Team[], targetScore: number): Team[] {
  return teams.filter(team => team.score >= targetScore)
}

/**
 * Advance to the next team in round-robin order.
 * Wraps back to 0 after the last team.
 *
 * Example with 3 teams:
 *   nextTeamIndex(0, 3) → 1
 *   nextTeamIndex(2, 3) → 0  ← wraps
 */
export function nextTeamIndex(currentIndex: number, teamCount: number): number {
  return (currentIndex + 1) % teamCount
}

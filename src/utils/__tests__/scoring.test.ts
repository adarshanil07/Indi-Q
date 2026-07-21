import { isGameOver, getWinners, nextTeamIndex } from '../scoring'
import { makeConfig } from '../../testUtils/factories'
import type { GameState, Team } from '../../types/game'

function stateWithScores(scores: number[], targetScore?: number, boardMode = false): GameState {
  const teams: Team[] = scores.map((score, i) => ({ id: `team-${i}`, name: `T${i}`, score }))
  return { config: makeConfig({ targetScore, boardMode }), teams } as GameState
}

describe('isGameOver', () => {
  it('is false while no team has reached the target', () => {
    expect(isGameOver(stateWithScores([3, 9], 10))).toBe(false)
  })

  it('is true when a team reaches or exceeds the target', () => {
    expect(isGameOver(stateWithScores([10, 2], 10))).toBe(true)
    expect(isGameOver(stateWithScores([12, 2], 10))).toBe(true)
  })

  it('is false with no target score (open-ended play)', () => {
    expect(isGameOver(stateWithScores([99, 2], undefined))).toBe(false)
  })

  it('is false in board mode regardless of scores', () => {
    expect(isGameOver(stateWithScores([99, 2], 10, true))).toBe(false)
  })
})

describe('getWinners', () => {
  const teams: Team[] = [
    { id: 'a', name: 'A', score: 10 },
    { id: 'b', name: 'B', score: 10 },
    { id: 'c', name: 'C', score: 4 },
  ]

  it('returns every team at or past the target (ties included)', () => {
    expect(getWinners(teams, 10).map(t => t.id)).toEqual(['a', 'b'])
  })

  it('returns empty when nobody reached the target', () => {
    expect(getWinners(teams, 11)).toEqual([])
  })
})

describe('nextTeamIndex', () => {
  it('advances round-robin and wraps', () => {
    expect(nextTeamIndex(0, 3)).toBe(1)
    expect(nextTeamIndex(1, 3)).toBe(2)
    expect(nextTeamIndex(2, 3)).toBe(0)
  })

  it('handles two teams', () => {
    expect(nextTeamIndex(0, 2)).toBe(1)
    expect(nextTeamIndex(1, 2)).toBe(0)
  })
})

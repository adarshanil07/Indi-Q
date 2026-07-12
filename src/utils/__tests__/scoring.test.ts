// =============================================================================
// utils/__tests__/scoring.test.ts
// Win-condition and turn-rotation logic.
// =============================================================================

import { isGameOver, getWinners, nextTeamIndex } from '../scoring'
import type { GameState, Team, GameConfig } from '../../types/game'

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    teamNames: ['A', 'B'],
    timerDuration: 60,
    maxActiveCards: 2,
    chakraCardCount: 3,
    chakraReward: 1,
    boardMode: false,
    ...overrides,
  }
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    config: makeConfig(),
    phase: 'playing',
    teams: [
      { id: 'team-0', name: 'A', score: 0 },
      { id: 'team-1', name: 'B', score: 0 },
    ],
    activeTeamIndex: 0,
    currentTurn: null,
    chakraState: null,
    deck: [],
    discardPile: [],
    cardUsage: {},
    turnHistory: [],
    resumeTeamIndex: null,
    completedWords: [],
    ...overrides,
  }
}

describe('isGameOver', () => {
  it('returns false when boardMode is on, regardless of scores', () => {
    const state = makeState({
      config: makeConfig({ boardMode: true, targetScore: 5 }),
      teams: [
        { id: 'team-0', name: 'A', score: 99 },
        { id: 'team-1', name: 'B', score: 0 },
      ],
    })
    expect(isGameOver(state)).toBe(false)
  })

  it('returns false when targetScore is undefined (manual end)', () => {
    const state = makeState({
      config: makeConfig({ targetScore: undefined }),
      teams: [{ id: 'team-0', name: 'A', score: 1000 }],
    })
    expect(isGameOver(state)).toBe(false)
  })

  it('returns false when no team has reached the target', () => {
    const state = makeState({
      config: makeConfig({ targetScore: 10 }),
      teams: [
        { id: 'team-0', name: 'A', score: 9 },
        { id: 'team-1', name: 'B', score: 5 },
      ],
    })
    expect(isGameOver(state)).toBe(false)
  })

  it('returns true when a team exactly reaches the target', () => {
    const state = makeState({
      config: makeConfig({ targetScore: 10 }),
      teams: [
        { id: 'team-0', name: 'A', score: 10 },
        { id: 'team-1', name: 'B', score: 3 },
      ],
    })
    expect(isGameOver(state)).toBe(true)
  })

  it('returns true when a team exceeds the target', () => {
    const state = makeState({
      config: makeConfig({ targetScore: 10 }),
      teams: [{ id: 'team-0', name: 'A', score: 12 }],
    })
    expect(isGameOver(state)).toBe(true)
  })

  it('handles targetScore of 0 as an immediate win', () => {
    const state = makeState({
      config: makeConfig({ targetScore: 0 }),
      teams: [{ id: 'team-0', name: 'A', score: 0 }],
    })
    expect(isGameOver(state)).toBe(true)
  })
})

describe('getWinners', () => {
  const teams: Team[] = [
    { id: 'team-0', name: 'A', score: 10 },
    { id: 'team-1', name: 'B', score: 7 },
    { id: 'team-2', name: 'C', score: 10 },
  ]

  it('returns the single team that reached the target', () => {
    const winners = getWinners(
      [
        { id: 'team-0', name: 'A', score: 10 },
        { id: 'team-1', name: 'B', score: 4 },
      ],
      10,
    )
    expect(winners.map(t => t.id)).toEqual(['team-0'])
  })

  it('returns multiple teams on a tie', () => {
    const winners = getWinners(teams, 10)
    expect(winners.map(t => t.id)).toEqual(['team-0', 'team-2'])
  })

  it('returns an empty array when no team qualifies', () => {
    expect(getWinners(teams, 11)).toEqual([])
  })

  it('includes teams above as well as at the target', () => {
    const winners = getWinners(
      [
        { id: 'team-0', name: 'A', score: 15 },
        { id: 'team-1', name: 'B', score: 10 },
      ],
      10,
    )
    expect(winners).toHaveLength(2)
  })
})

describe('nextTeamIndex', () => {
  it('advances to the next index', () => {
    expect(nextTeamIndex(0, 3)).toBe(1)
    expect(nextTeamIndex(1, 3)).toBe(2)
  })

  it('wraps back to 0 after the last team', () => {
    expect(nextTeamIndex(2, 3)).toBe(0)
  })

  it('stays at 0 with a single team', () => {
    expect(nextTeamIndex(0, 1)).toBe(0)
  })

  it('works with two teams (the most common setup)', () => {
    expect(nextTeamIndex(0, 2)).toBe(1)
    expect(nextTeamIndex(1, 2)).toBe(0)
  })
})

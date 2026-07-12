// =============================================================================
// test-utils/fixtures.ts
// Shared factories for building Cards, GameConfig, and GameState in tests.
// =============================================================================

import type { Card, GameConfig, GameState, TurnState } from '../types/game'

/** Build a card whose six words are derived from the id, e.g. "c1-People". */
export function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    words: {
      People: `${id}-People`,
      Location: `${id}-Location`,
      Object: `${id}-Object`,
      Movie: `${id}-Movie`,
      Nature: `${id}-Nature`,
      Random: `${id}-Random`,
    },
    chakraCategory: 'Movie',
    ...overrides,
  }
}

/** Build n cards with ids c1..cn. */
export function makeCards(n: number): Card[] {
  return Array.from({ length: n }, (_, i) => makeCard(`c${i + 1}`))
}

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    teamNames: ['Red', 'Blue'],
    timerDuration: 60,
    maxActiveCards: 2,
    chakraCardCount: 3,
    chakraReward: 1,
    boardMode: false,
    ...overrides,
  }
}

export function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    config: makeConfig(),
    phase: 'playing',
    teams: [
      { id: 'team-0', name: 'Red', score: 0 },
      { id: 'team-1', name: 'Blue', score: 0 },
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

export function makeTurn(overrides: Partial<TurnState> = {}): TurnState {
  return {
    teamId: 'team-0',
    phase: 'active',
    activeCards: [],
    skipsUsed: 0,
    correctIds: [],
    voidedIds: [],
    selectedCategory: null,
    timerStartedAt: null,
    ...overrides,
  }
}

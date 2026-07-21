// =============================================================================
// testUtils/factories.ts
// Shared builders for tests: cards, configs, and pre-played game states.
// Everything goes through the real reducer so tests exercise genuine flows.
// =============================================================================

import type { Card, Category, GameConfig, GameState } from '../types/game'
import { CATEGORIES } from '../constants/categories'
import { gameReducer } from '../store/gameReducer'
import type { GameAction } from '../store/gameActions'

/** A card whose words are derived from its id, e.g. "c1-People". */
export function makeCard(id: string, chakraCategory: Category = 'People'): Card {
  const words = {} as Record<Category, string>
  for (const cat of CATEGORIES) words[cat] = `${id}-${cat}`
  return { id, words, chakraCategory }
}

export function makeDeck(size: number): Card[] {
  return Array.from({ length: size }, (_, i) => makeCard(`c${i + 1}`))
}

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    teamNames: ['Team A', 'Team B'],
    timerDuration: 60,
    maxActiveCards: 2,
    chakraCardCount: 3,
    chakraReward: 1,
    boardMode: false,
    ...overrides,
  }
}

/** Run a list of actions through the real reducer, starting from START_GAME. */
export function playActions(
  config: GameConfig,
  deck: Card[],
  actions: GameAction[],
): GameState {
  let state = gameReducer(
    // The reducer replaces the entire state on START_GAME, so the seed
    // object only needs to be shaped like a GameState.
    {} as GameState,
    { type: 'START_GAME', config, deck },
  )
  for (const action of actions) state = gameReducer(state, action)
  return state
}

/** Start a game and immediately start (and optionally reveal) the first turn. */
export function startedTurn(
  config: GameConfig = makeConfig(),
  deck: Card[] = makeDeck(10),
  { reveal = true, category = 'People' as Category } = {},
): GameState {
  const actions: GameAction[] = [{ type: 'START_TURN' }]
  if (!config.boardMode) actions.push({ type: 'SELECT_CATEGORY', category })
  if (reveal) actions.push({ type: 'REVEAL_CARD' })
  return playActions(config, deck, actions)
}

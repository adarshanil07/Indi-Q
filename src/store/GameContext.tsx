import React, { createContext, useContext, useReducer } from 'react'
import { gameReducer } from './gameReducer'
import type { GameState, GameConfig, Card } from '../types/game'
import type { GameAction } from './gameActions'
import { shuffle } from '../utils/deck'
import rawCards from '../data/cards.json'

const ALL_CARDS = rawCards as Card[]

const initialState: GameState = {
  config: {
    teamNames: [],
    timerDuration: 60,
    maxActiveCards: 2,
    chakraCardCount: 3,
    chakraReward: 1,
    boardMode: false,
  },
  phase: 'setup',
  teams: [],
  activeTeamIndex: 0,
  currentTurn: null,
  chakraState: null,
  deck: [],
  discardPile: [],
  cardUsage: {},
  turnHistory: [],
  resumeTeamIndex: null,
  completedWords: [],
}

interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}

/** Convenience: start a new game from a config object. Shuffles the deck. */
export function useStartGame() {
  const { dispatch } = useGame()
  return (config: GameConfig) =>
    dispatch({ type: 'START_GAME', config, deck: shuffle(ALL_CARDS) })
}

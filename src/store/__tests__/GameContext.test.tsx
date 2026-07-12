// =============================================================================
// store/__tests__/GameContext.test.tsx
// Provider wiring: initial state, dispatch flow, useStartGame, guard rail.
// =============================================================================

import { renderHook, act } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { GameProvider, useGame, useStartGame } from '../GameContext'
import { makeConfig } from '../../test-utils/fixtures'
import rawCards from '../../data/cards.json'

const wrapper = ({ children }: { children: ReactNode }) => (
  <GameProvider>{children}</GameProvider>
)

describe('useGame', () => {
  it('throws a clear error when used outside the provider', async () => {
    // Silence React's error boundary noise for this expected throw
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(renderHook(() => useGame())).rejects.toThrow(
        'useGame must be used inside <GameProvider>',
      )
    } finally {
      spy.mockRestore()
    }
  })

  it('exposes the initial setup-phase state', async () => {
    const { result } = await renderHook(() => useGame(), { wrapper })
    const { state } = result.current
    expect(state.phase).toBe('setup')
    expect(state.teams).toEqual([])
    expect(state.deck).toEqual([])
    expect(state.currentTurn).toBeNull()
    expect(state.config.timerDuration).toBe(60)
  })

  it('dispatch runs actions through the reducer', async () => {
    const { result } = await renderHook(() => useGame(), { wrapper })
    await act(async () => {
      result.current.dispatch({
        type: 'START_GAME',
        config: makeConfig({ teamNames: ['X', 'Y'] }),
        deck: [],
      })
    })
    expect(result.current.state.phase).toBe('playing')
    expect(result.current.state.teams.map(t => t.name)).toEqual(['X', 'Y'])
  })
})

describe('useStartGame', () => {
  it('starts a game with the full shuffled card database', async () => {
    const { result } = await renderHook(
      () => ({ game: useGame(), start: useStartGame() }),
      { wrapper },
    )

    await act(async () => {
      result.current.start(makeConfig({ teamNames: ['A', 'B', 'C'] }))
    })

    const { state } = result.current.game
    expect(state.phase).toBe('playing')
    expect(state.teams).toHaveLength(3)
    // Deck contains every card from cards.json exactly once
    expect(state.deck).toHaveLength((rawCards as unknown[]).length)
    expect(new Set(state.deck.map(c => c.id)).size).toBe(state.deck.length)
  })
})

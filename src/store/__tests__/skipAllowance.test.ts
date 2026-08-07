// =============================================================================
// The "Skips" setting must grant exactly as many skips as it says.
//
// It previously bound straight to maxActiveCards — the cards-on-screen
// allowance — so every choice granted one fewer skip than its label, and
// choosing 1 granted none at all.
// =============================================================================

import { gameReducer } from '../gameReducer'
import { makeConfig, makeDeck, playActions } from '../../testUtils/factories'
import {
  UNLIMITED_SKIPS,
  maxActiveCardsForSkips,
  skipsForMaxActiveCards,
} from '../../constants/gameRules'
import type { GameState } from '../../types/game'

/** Skips actually granted in one turn for a given skip allowance. */
function skipsGranted(skipsAllowed: number): number {
  let state: GameState = playActions(
    makeConfig({ maxActiveCards: maxActiveCardsForSkips(skipsAllowed) }),
    makeDeck(30),
    [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
    ],
  )

  let granted = 0
  for (let i = 0; i < 20; i++) {
    const before = state.currentTurn!.activeCards.length
    state = gameReducer(state, { type: 'SKIP' })
    if (state.currentTurn!.activeCards.length === before) break
    granted++
  }
  return granted
}

describe('skip allowance', () => {
  it.each([1, 2, 3])('granting %i skips allows exactly %i skips', n => {
    expect(skipsGranted(n)).toBe(n)
  })

  it('unlimited keeps granting skips', () => {
    expect(skipsGranted(UNLIMITED_SKIPS)).toBeGreaterThan(10)
  })

  it('cards on screen is always one more than the skip allowance', () => {
    expect(maxActiveCardsForSkips(1)).toBe(2)
    expect(maxActiveCardsForSkips(3)).toBe(4)
    expect(maxActiveCardsForSkips(UNLIMITED_SKIPS)).toBe(UNLIMITED_SKIPS)
  })

  it('migrates an older saved cards-on-screen value back to skips', () => {
    // Someone who had picked "2" under Skips was stored as maxActiveCards 2.
    expect(skipsForMaxActiveCards(2)).toBe(1)
    expect(skipsForMaxActiveCards(4)).toBe(3)
    expect(skipsForMaxActiveCards(UNLIMITED_SKIPS)).toBe(UNLIMITED_SKIPS)
    // Never below one skip, whatever is stored.
    expect(skipsForMaxActiveCards(1)).toBe(1)
  })
})

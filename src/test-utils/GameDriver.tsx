// =============================================================================
// test-utils/GameDriver.tsx
// Test-only helper: mounts inside <GameProvider> and hands the latest
// { state, dispatch } to the test so screens can be driven through the real
// reducer instead of mocked state.
// =============================================================================

import { useGame } from '../store/GameContext'
import type { GameState } from '../types/game'
import type { GameAction } from '../store/gameActions'

export interface GameHandle {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function GameDriver({ onUpdate }: { onUpdate: (handle: GameHandle) => void }) {
  const { state, dispatch } = useGame()
  onUpdate({ state, dispatch })
  return null
}

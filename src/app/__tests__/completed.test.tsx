// =============================================================================
// app/__tests__/completed.test.tsx
// Completed Words screen: empty state, per-round grouping, chakra labels.
// =============================================================================

import { render, screen, fireEvent, act } from '@testing-library/react-native'
import { router } from 'expo-router'
import CompletedWordsScreen from '../completed'
import { GameProvider } from '@/store/GameContext'
import { GameDriver, type GameHandle } from '@/test-utils/GameDriver'
import { makeCards, makeConfig } from '@/test-utils/fixtures'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
)

let game: GameHandle

async function renderCompleted() {
  await render(
    <GameProvider>
      <GameDriver onUpdate={h => (game = h)} />
      <CompletedWordsScreen />
    </GameProvider>,
  )
}

const dispatch = (action: Parameters<GameHandle['dispatch']>[0]) =>
  act(async () => game.dispatch(action))

describe('CompletedWordsScreen', () => {
  it('shows the empty state before any word is guessed', async () => {
    await renderCompleted()
    expect(screen.getByText('No words completed yet')).toBeTruthy()
    expect(screen.getByText('Correctly guessed words will appear here.')).toBeTruthy()
  })

  it('lists guessed words grouped under category and team', async () => {
    await renderCompleted()
    await dispatch({ type: 'START_GAME', config: makeConfig(), deck: makeCards(6) })
    await dispatch({ type: 'START_TURN' })
    await dispatch({ type: 'SELECT_CATEGORY', category: 'Movie' })
    await dispatch({ type: 'REVEAL_CARD' })
    await dispatch({ type: 'MARK_CORRECT', cardId: 'c1' })
    await dispatch({ type: 'MARK_CORRECT', cardId: 'c2' })

    // Header count and both words in one round box
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('c1-Movie')).toBeTruthy()
    expect(screen.getByText('c2-Movie')).toBeTruthy()
    expect(screen.getByText('Movie')).toBeTruthy() // group category header
    expect(screen.getByText('Red')).toBeTruthy() // group team name
  })

  it('labels chakra-round words with the chakra marker', async () => {
    await renderCompleted()
    await dispatch({ type: 'START_GAME', config: makeConfig(), deck: makeCards(6) })
    await dispatch({ type: 'TRIGGER_CHAKRA' })
    const chakraCard = game.state.chakraState!.cards[0]
    await dispatch({ type: 'SELECT_CHAKRA_CARD', card: chakraCard })
    await dispatch({ type: 'CHAKRA_CORRECT', winningTeamId: 'team-1' })

    expect(screen.getByText('☸ Chakra')).toBeTruthy()
    expect(screen.getByText(`${chakraCard.id}-Movie`)).toBeTruthy()
    expect(screen.getByText('Blue')).toBeTruthy()
  })

  it('navigates back to the game', async () => {
    await renderCompleted()
    await fireEvent.press(screen.getByText('← Back to game'))
    expect(router.back).toHaveBeenCalledTimes(1)
  })
})

// =============================================================================
// app/__tests__/results.test.tsx
// Winner/tie display and post-game navigation, driven through the real store.
// =============================================================================

import { render, screen, fireEvent, act } from '@testing-library/react-native'
import { router } from 'expo-router'
import ResultsScreen from '../results'
import { GameProvider } from '@/store/GameContext'
import { GameDriver, type GameHandle } from '@/test-utils/GameDriver'
import { makeConfig } from '@/test-utils/fixtures'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
)

let game: GameHandle

async function renderResults(scores: Record<string, number>, names = ['Red', 'Blue']) {
  await render(
    <GameProvider>
      <GameDriver onUpdate={h => (game = h)} />
      <ResultsScreen />
    </GameProvider>,
  )
  await act(async () => {
    game.dispatch({ type: 'START_GAME', config: makeConfig({ teamNames: names }), deck: [] })
  })
  for (const [teamId, score] of Object.entries(scores)) {
    await act(async () => {
      game.dispatch({ type: 'SET_TEAM_SCORE', teamId, score })
    })
  }
  await act(async () => {
    game.dispatch({ type: 'END_GAME' })
  })
}

describe('ResultsScreen', () => {
  it('crowns the single highest-scoring team', async () => {
    await renderResults({ 'team-0': 3, 'team-1': 8 })
    expect(screen.getByText('Winner!')).toBeTruthy()
    // Hero name + leaderboard row both carry the winner's name
    expect(screen.getAllByText('Blue').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('8 pts')).toBeTruthy()
  })

  it('announces a tie with both names', async () => {
    await renderResults({ 'team-0': 5, 'team-1': 5 })
    expect(screen.getByText("It's a Tie!")).toBeTruthy()
    expect(screen.getByText('Red & Blue')).toBeTruthy()
  })

  it('lists final scores in descending order with ranks', async () => {
    await renderResults({ 'team-0': 2, 'team-1': 9, 'team-2': 5 }, ['Red', 'Blue', 'Green'])
    expect(screen.getByText('Final Scores')).toBeTruthy()
    expect(screen.getByText('#1')).toBeTruthy()
    expect(screen.getByText('#2')).toBeTruthy()
    expect(screen.getByText('#3')).toBeTruthy()
    // Ranks pair with sorted scores
    const json = JSON.stringify(screen.toJSON())
    expect(json.indexOf('Blue')).toBeLessThan(json.indexOf('Green'))
    expect(json.indexOf('Green')).toBeLessThan(json.indexOf('"Red"'))
  })

  it('Play Again returns to setup', async () => {
    await renderResults({ 'team-0': 1 })
    await fireEvent.press(screen.getByText('Play Again'))
    expect(router.replace).toHaveBeenCalledWith('/setup')
  })

  it('Home returns to the home screen', async () => {
    await renderResults({ 'team-0': 1 })
    await fireEvent.press(screen.getByText('Home'))
    expect(router.replace).toHaveBeenCalledWith('/')
  })
})

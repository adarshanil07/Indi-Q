// =============================================================================
// app/__tests__/setup.test.tsx
// Game Setup: option pickers, validation, persistence, and game start.
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { Switch } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import SetupScreen from '../setup'
import { GameProvider } from '@/store/GameContext'
import { GameDriver, type GameHandle } from '@/test-utils/GameDriver'
import { saveSetup } from '@/utils/setupStorage'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

let game: GameHandle

async function renderSetup() {
  await render(
    <GameProvider>
      <GameDriver onUpdate={h => (game = h)} />
      <SetupScreen />
    </GameProvider>,
  )
}

beforeEach(async () => {
  await AsyncStorage.clear()
})

describe('SetupScreen — defaults and options', () => {
  it('renders every configuration section', async () => {
    await renderSetup()
    for (const label of [
      'Number of Teams',
      'Team Names',
      'Timer Duration',
      'Skips per Turn',
      'Board Mode',
      'Target Score (optional)',
      'Chakra Cards',
      'Chakra Reward',
    ]) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  it('starts with two default team name fields', async () => {
    await renderSetup()
    expect(screen.getByDisplayValue('Team 1')).toBeTruthy()
    expect(screen.getByDisplayValue('Team 2')).toBeTruthy()
    expect(screen.queryByDisplayValue('Team 3')).toBeNull()
  })

  it('adds a name field when the team count increases', async () => {
    await renderSetup()
    // '3' appears in several pickers — the team-count picker renders first
    await fireEvent.press(screen.getAllByText('3')[0])
    expect(screen.getByDisplayValue('Team 3')).toBeTruthy()
  })

  it('hides the target score section in board mode', async () => {
    await renderSetup()
    await fireEvent(screen.getByRole('switch'), 'valueChange', true)
    expect(screen.getByText('Digital board enabled')).toBeTruthy()
    expect(screen.queryByText('Target Score (optional)')).toBeNull()
  })

  it('explains the selected chakra reward', async () => {
    await renderSetup()
    expect(screen.getByText(/gains 1 point\./)).toBeTruthy()
    await fireEvent.press(screen.getByText('Extra Round'))
    expect(
      screen.getByText('The team that guesses the Chakra word first plays a bonus round.'),
    ).toBeTruthy()
  })
})

describe('SetupScreen — starting a game', () => {
  it('starts the game with defaults and navigates to /game', async () => {
    await renderSetup()
    await fireEvent.press(screen.getByText('Start Game'))

    expect(router.replace).toHaveBeenCalledWith('/game')
    expect(game.state.phase).toBe('playing')
    expect(game.state.teams.map(t => t.name)).toEqual(['Team 1', 'Team 2'])
    expect(game.state.config.timerDuration).toBe(60)
    expect(game.state.config.maxActiveCards).toBe(2)
    expect(game.state.config.targetScore).toBeUndefined()
    expect(game.state.deck.length).toBeGreaterThan(0)
  })

  it('applies edited names, timer, and target score', async () => {
    await renderSetup()
    await fireEvent.changeText(screen.getByDisplayValue('Team 1'), 'Lions')
    await fireEvent.changeText(screen.getByDisplayValue('Team 2'), 'Tigers')
    await fireEvent.press(screen.getByText('90s'))
    await fireEvent.changeText(
      screen.getByPlaceholderText('Leave blank for open-ended play'),
      '15',
    )
    await fireEvent.press(screen.getByText('Start Game'))

    expect(game.state.teams.map(t => t.name)).toEqual(['Lions', 'Tigers'])
    expect(game.state.config.timerDuration).toBe(90)
    expect(game.state.config.targetScore).toBe(15)
  })

  it('persists the chosen setup for next time', async () => {
    await renderSetup()
    await fireEvent.press(screen.getByText('120s'))
    await fireEvent.press(screen.getByText('Start Game'))

    const raw = await AsyncStorage.getItem('indiq.setup.v1')
    expect(raw).not.toBeNull()
    const saved = JSON.parse(raw!)
    expect(saved.timerDuration).toBe(120)
    expect(saved.teamNames).toEqual(['Team 1', 'Team 2'])
  })

  it('restores a previously saved setup on mount', async () => {
    await saveSetup({
      teamCount: 3,
      teamNames: ['A-Team', 'B-Team', 'C-Team'],
      timerDuration: 30,
      maxActiveCards: 3,
      boardMode: false,
      targetScoreText: '25',
      chakraCardCount: 4,
      chakraReward: 2,
    })
    await renderSetup()
    expect(await screen.findByDisplayValue('A-Team')).toBeTruthy()
    expect(screen.getByDisplayValue('C-Team')).toBeTruthy()
    expect(screen.getByDisplayValue('25')).toBeTruthy()
  })

  it('rejects a blank-only team list', async () => {
    await renderSetup()
    await fireEvent.changeText(screen.getByDisplayValue('Team 1'), '   ')
    await fireEvent.press(screen.getByText('Start Game'))
    expect(screen.getByText('Please name at least 2 teams.')).toBeTruthy()
    expect(router.replace).not.toHaveBeenCalled()
    expect(game.state.phase).toBe('setup')
  })

  it('rejects an invalid target score', async () => {
    await renderSetup()
    await fireEvent.changeText(
      screen.getByPlaceholderText('Leave blank for open-ended play'),
      '0',
    )
    await fireEvent.press(screen.getByText('Start Game'))
    expect(
      screen.getByText('Target score must be a number greater than 0, or left blank.'),
    ).toBeTruthy()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('navigates back from the header', async () => {
    await renderSetup()
    await fireEvent.press(screen.getByText('← Back'))
    expect(router.back).toHaveBeenCalledTimes(1)
  })
})

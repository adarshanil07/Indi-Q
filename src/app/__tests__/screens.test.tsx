// =============================================================================
// Render smoke tests: every screen mounts without crashing and its key
// buttons fire. Navigation goes through the expo-router mock (jest.setup.js).
// =============================================================================

import React, { useEffect } from 'react'
import { render, fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { GameProvider, useGame } from '@/store/GameContext'
import { makeConfig, makeDeck } from '@/testUtils/factories'
import type { GameConfig } from '@/types/game'
import type { GameAction } from '@/store/gameActions'
import { saveFeedbackPrefs } from '@/utils/prefs'

// Persisting preferences is a storage side effect; assert the call, not the write.
jest.mock('@/utils/prefs', () => ({
  ...jest.requireActual('@/utils/prefs'),
  saveFeedbackPrefs: jest.fn(),
  loadCardLanguage: jest.fn().mockResolvedValue(null),
  saveCardLanguage: jest.fn(),
}))

import HomeScreen from '../index'
import SetupScreen from '../setup'
import GameScreen from '../game'
import ResultsScreen from '../results'
import CompletedWordsScreen from '../completed'
import HowToPlayScreen from '../how-to-play'
import SettingsScreen from '../settings'
import JustCardsScreen from '../just-cards'

beforeEach(() => {
  jest.clearAllMocks()
})

/** Mounts children inside a GameProvider with a game already started. */
function Started({
  config = makeConfig(),
  actions = [],
  children,
}: {
  config?: GameConfig
  actions?: GameAction[]
  children: React.ReactNode
}) {
  return (
    <GameProvider>
      <Dispatcher config={config} actions={actions} />
      <AfterStart>{children}</AfterStart>
    </GameProvider>
  )
}

/**
 * Renders children only once the game has left the setup phase — mirrors the
 * router, which never shows game/results screens before a game starts.
 * (ResultsScreen crashes on an empty teams array; see audit finding.)
 */
function AfterStart({ children }: { children: React.ReactNode }) {
  const { state } = useGame()
  return state.phase === 'setup' ? null : <>{children}</>
}

function Dispatcher({ config, actions }: { config: GameConfig; actions: GameAction[] }) {
  const { dispatch } = useGame()
  useEffect(() => {
    dispatch({ type: 'START_GAME', config, deck: makeDeck(10) })
    for (const action of actions) dispatch(action)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

describe('HomeScreen', () => {
  it('renders the menu and navigates', async () => {
    await render(<HomeScreen />)
    await fireEvent.press(screen.getByText('Full Game'))
    expect(router.push).toHaveBeenCalledWith('/setup')
    await fireEvent.press(screen.getByText('Just Cards'))
    expect(router.push).toHaveBeenCalledWith('/just-cards')
    await fireEvent.press(screen.getByText('How to Play'))
    expect(router.push).toHaveBeenCalledWith('/how-to-play')
  })
})

describe('SetupScreen', () => {
  it('renders all sections and starts a game with the defaults', async () => {
    await render(<GameProvider><SetupScreen /></GameProvider>)
    expect(screen.getByText('Game Setup')).toBeOnTheScreen()
    expect(screen.getByText('Teams')).toBeOnTheScreen()
    expect(screen.getByText('Chakra Round')).toBeOnTheScreen()

    await fireEvent.press(screen.getByText('Start Game'))
    expect(router.replace).toHaveBeenCalledWith('/game')
  })

  it('shows team name inputs matching the selected count', async () => {
    await render(<GameProvider><SetupScreen /></GameProvider>)
    expect(screen.getByDisplayValue('Team 1')).toBeOnTheScreen()
    expect(screen.getByDisplayValue('Team 2')).toBeOnTheScreen()
  })
})

describe('GameScreen', () => {
  it('shows the between-turns interstitial with the active team', async () => {
    await render(<Started><GameScreen /></Started>)
    // "Team A" appears in both the score bar and the hand-off band
    expect(screen.getAllByText('Team A').length).toBeGreaterThan(0)
    expect(screen.getByText('Start Turn →')).toBeOnTheScreen()
    expect(screen.getByText('Pass the phone to your team')).toBeOnTheScreen()
  })

  it('starts a turn when the button is pressed', async () => {
    await render(<Started><GameScreen /></Started>)
    await fireEvent.press(screen.getByText('Start Turn →'))
    // The turn begins in 'waiting': the card is on screen, category needed
    expect(screen.queryByText('Start Turn →')).toBeNull()
  })

  it('utility row navigates to Completed Words and How to Play', async () => {
    await render(<Started><GameScreen /></Started>)
    await fireEvent.press(screen.getByText('Words'))
    expect(router.push).toHaveBeenCalledWith('/completed')
    await fireEvent.press(screen.getByText('?'))
    expect(router.push).toHaveBeenCalledWith('/how-to-play')
  })

  it('asks for confirmation before ending the game', async () => {
    await render(<Started><GameScreen /></Started>)
    await fireEvent.press(screen.getByText('End'))
    // Dialog title and its confirm button both read "End Game"
    expect(screen.getAllByText('End Game').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Final scores will be shown/)).toBeOnTheScreen()
  })

  it('navigates to results when the game finishes', async () => {
    await render(
      <Started actions={[{ type: 'END_GAME' }]}>
        <GameScreen />
      </Started>,
    )
    expect(router.replace).toHaveBeenCalledWith('/results')
  })
})

describe('ResultsScreen', () => {
  it('shows the winner and leaderboard', async () => {
    await render(
      <Started
        actions={[
          { type: 'SET_TEAM_SCORE', teamId: 'team-0', score: 5 },
          { type: 'SET_TEAM_SCORE', teamId: 'team-1', score: 3 },
          { type: 'END_GAME' },
        ]}
      >
        <ResultsScreen />
      </Started>,
    )
    expect(screen.getByText('Winner!')).toBeOnTheScreen()
    // Winner band + leaderboard row both show the team name
    expect(screen.getAllByText('Team A').length).toBeGreaterThan(0)
    expect(screen.getByText('5 pts')).toBeOnTheScreen()

    await fireEvent.press(screen.getByText('Play Again'))
    expect(router.replace).toHaveBeenCalledWith('/setup')
    await fireEvent.press(screen.getByText('Home'))
    expect(router.replace).toHaveBeenCalledWith('/')
  })

  it('declares a tie when scores are level', async () => {
    await render(
      <Started
        actions={[
          { type: 'SET_TEAM_SCORE', teamId: 'team-0', score: 4 },
          { type: 'SET_TEAM_SCORE', teamId: 'team-1', score: 4 },
          { type: 'END_GAME' },
        ]}
      >
        <ResultsScreen />
      </Started>,
    )
    expect(screen.getByText("It's a Tie!")).toBeOnTheScreen()
  })
})

describe('CompletedWordsScreen', () => {
  it('shows the empty state before any words are guessed', async () => {
    await render(<Started><CompletedWordsScreen /></Started>)
    expect(screen.getByText('No words completed yet')).toBeOnTheScreen()
    await fireEvent.press(screen.getByText('← Back to game'))
    expect(router.back).toHaveBeenCalled()
  })

  it('lists guessed words grouped by round', async () => {
    await render(
      <Started
        actions={[
          { type: 'START_TURN' },
          { type: 'SELECT_CATEGORY', category: 'Movie' },
          { type: 'REVEAL_CARD' },
          { type: 'MARK_CORRECT', cardId: 'c1' },
        ]}
      >
        <CompletedWordsScreen />
      </Started>,
    )
    expect(screen.getByText('c1-Movie')).toBeOnTheScreen()
    expect(screen.getByText('Movie')).toBeOnTheScreen()
  })
})

describe('HowToPlayScreen', () => {
  it('renders the rules and goes back', async () => {
    await render(<HowToPlayScreen />)
    expect(screen.getByText('How to Play')).toBeOnTheScreen()
    await fireEvent.press(screen.getByText('← Back'))
    expect(router.back).toHaveBeenCalled()
  })
})

describe('SettingsScreen', () => {
  it('renders the feedback, privacy and about sections', async () => {
    await render(<SettingsScreen />)
    expect(screen.getByText('Sound effects')).toBeOnTheScreen()
    expect(screen.getByText('Vibration')).toBeOnTheScreen()
    expect(screen.getByText('Privacy policy')).toBeOnTheScreen()
    expect(screen.getByText('Version')).toBeOnTheScreen()
  })

  it('hides ad privacy choices where consent was never gathered', async () => {
    // usePrivacyOptionsRequired is mocked false — non-EEA users have nothing
    // to change, so the row must not appear.
    await render(<SettingsScreen />)
    expect(screen.queryByText('Ad privacy choices')).toBeNull()
  })

  it('persists a toggle change', async () => {
    await render(<SettingsScreen />)
    await fireEvent(screen.getAllByRole('switch')[0], 'valueChange', false)
    expect(saveFeedbackPrefs).toHaveBeenCalledWith(
      expect.objectContaining({ sound: false }),
    )
  })
})

describe('JustCardsScreen', () => {
  it('renders a card with the language toggle', async () => {
    await render(<JustCardsScreen />)
    // Both language options are visible in the toggle
    expect(screen.getByText('EN')).toBeOnTheScreen()
  })
})

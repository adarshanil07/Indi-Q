// =============================================================================
// app/__tests__/game.test.tsx
// The main game screen, driven end-to-end through the real provider/reducer:
// interstitial → turn → scoring → turn end → undo → chakra → game over.
// =============================================================================

import { render, screen, fireEvent, act } from '@testing-library/react-native'
import { router } from 'expo-router'
import GameScreen from '../game'
import { GameProvider } from '@/store/GameContext'
import { GameDriver, type GameHandle } from '@/test-utils/GameDriver'
import { makeCards, makeConfig } from '@/test-utils/fixtures'
import type { GameConfig } from '@/types/game'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
)

let game: GameHandle

const dispatch = (action: Parameters<GameHandle['dispatch']>[0]) =>
  act(async () => game.dispatch(action))

async function renderGame(config: Partial<GameConfig> = {}, deckSize = 12) {
  await render(
    <GameProvider>
      <GameDriver onUpdate={h => (game = h)} />
      <GameScreen />
    </GameProvider>,
  )
  await dispatch({
    type: 'START_GAME',
    config: makeConfig(config),
    deck: makeCards(deckSize),
  })
}

/** Walk the UI from the interstitial into an active revealed turn. */
async function startActiveTurn() {
  await fireEvent.press(screen.getByText('Start Turn →'))
  await fireEvent.press(screen.getByTestId('category-box-Movie'))
  await fireEvent.press(screen.getByTestId(`game-card-${game.state.currentTurn!.activeCards[0].id}`))
}

describe('GameScreen — phases outside play', () => {
  it('renders nothing during the setup phase', async () => {
    await render(
      <GameProvider>
        <GameDriver onUpdate={h => (game = h)} />
        <GameScreen />
      </GameProvider>,
    )
    expect(screen.toJSON()).toBeNull()
  })

  it('redirects to results when the game finishes', async () => {
    await renderGame()
    await dispatch({ type: 'END_GAME' })
    expect(router.replace).toHaveBeenCalledWith('/results')
  })
})

describe('GameScreen — between turns', () => {
  it('shows the interstitial with the upcoming team', async () => {
    await renderGame()
    expect(screen.getByText('Next up')).toBeTruthy()
    expect(screen.getAllByText('Red').length).toBeGreaterThan(0) // pill + interstitial
    expect(screen.getByText('Pass the phone to your team')).toBeTruthy()
    expect(screen.getByText('Start Turn →')).toBeTruthy()
    expect(screen.getByText('☸ Chakra Round')).toBeTruthy()
  })

  it('hides Undo before any turn has been played', async () => {
    await renderGame()
    expect(screen.queryByText('Undo')).toBeNull()
  })

  it('End button asks for confirmation, then finishes the game', async () => {
    await renderGame()
    await fireEvent.press(screen.getByText('End'))
    expect(screen.getByText('Are you sure you want to end the game? Final scores will be shown.')).toBeTruthy()
    // 'End Game' is both the dialog title and its confirm button — press the button
    await fireEvent.press(screen.getAllByText('End Game')[1])
    expect(game.state.phase).toBe('finished')
    expect(router.replace).toHaveBeenCalledWith('/results')
  })

  it('cancelling the End dialog keeps playing', async () => {
    await renderGame()
    await fireEvent.press(screen.getByText('End'))
    await fireEvent.press(screen.getByText('Cancel'))
    expect(game.state.phase).toBe('playing')
    expect(screen.queryByText('End Game')).toBeNull()
  })

  it('Words opens the completed-words screen', async () => {
    await renderGame()
    await fireEvent.press(screen.getByText('Words'))
    expect(router.push).toHaveBeenCalledWith('/completed')
  })
})

describe('GameScreen — playing a turn', () => {
  it('starts a turn into the waiting phase with a locked card', async () => {
    await renderGame()
    await fireEvent.press(screen.getByText('Start Turn →'))
    expect(screen.getByText('SELECT A CATEGORY')).toBeTruthy()
    expect(game.state.currentTurn!.phase).toBe('waiting')
  })

  it('blocks reveal until a category is chosen', async () => {
    await renderGame()
    await fireEvent.press(screen.getByText('Start Turn →'))
    const cardId = game.state.currentTurn!.activeCards[0].id
    await fireEvent.press(screen.getByTestId(`game-card-${cardId}`))
    expect(game.state.currentTurn!.phase).toBe('waiting') // still locked

    await fireEvent.press(screen.getByTestId('category-box-Movie'))
    expect(screen.getByText('TAP TO REVEAL')).toBeTruthy()
    await fireEvent.press(screen.getByTestId(`game-card-${cardId}`))
    expect(game.state.currentTurn!.phase).toBe('active')
    expect(screen.getByText(`${cardId}-Movie`)).toBeTruthy() // words visible
  })

  it('marks a card correct: score, +1 badge, replacement card drawn', async () => {
    await renderGame()
    await startActiveTurn()
    await fireEvent.press(screen.getByText('Correct ✓'))

    expect(game.state.teams[0].score).toBe(1)
    expect(screen.getByText('+1')).toBeTruthy()
    // Replacement card was drawn to keep one card on screen
    expect(game.state.currentTurn!.activeCards).toHaveLength(1)
  })

  it('skips: second card appears and the skip allowance shrinks', async () => {
    await renderGame({ maxActiveCards: 2 })
    await startActiveTurn()
    expect(screen.getByText('Skip (1 left)')).toBeTruthy()
    await fireEvent.press(screen.getByText('Skip (1 left)'))
    expect(game.state.currentTurn!.activeCards).toHaveLength(2)
    // At the limit the skip button disappears
    expect(screen.queryByText(/Skip \(/)).toBeNull()
  })

  it('voids a card via the Void button', async () => {
    await renderGame()
    await startActiveTurn()
    const cardId = game.state.currentTurn!.activeCards[0].id
    await fireEvent.press(screen.getByText('Void'))
    expect(screen.getByText('VOID')).toBeTruthy()
    expect(game.state.currentTurn!.voidedIds).toEqual([cardId])
  })

  it('restart asks for confirmation, then resets the turn', async () => {
    await renderGame()
    await startActiveTurn()
    await fireEvent.press(screen.getByText('Restart'))
    // The turn header 'Restart' stays visible behind the dialog — the dialog
    // confirm button is the second match
    await fireEvent.press(screen.getAllByText(/^Restart$/)[1])
    expect(game.state.currentTurn!.phase).toBe('waiting')
    expect(game.state.currentTurn!.selectedCategory).toBeNull()
  })

  it('timer expiry re-blurs cards and offers End Turn', async () => {
    await renderGame()
    await startActiveTurn()
    await dispatch({ type: 'TIMER_EXPIRED' })
    expect(screen.getByText("TIME'S UP")).toBeTruthy()
    expect(screen.getByText('End Turn →')).toBeTruthy()

    await fireEvent.press(screen.getByText('End Turn →'))
    // Back to the interstitial for the next team
    expect(screen.getByText('Next up')).toBeTruthy()
    expect(game.state.activeTeamIndex).toBe(1)
    expect(game.state.turnHistory).toHaveLength(1)
  })

  it('undo reverses the last completed turn from the interstitial', async () => {
    await renderGame()
    await startActiveTurn()
    await fireEvent.press(screen.getByText('Correct ✓'))
    await dispatch({ type: 'TIMER_EXPIRED' })
    await fireEvent.press(screen.getByText('End Turn →'))

    expect(game.state.teams[0].score).toBe(1)
    await fireEvent.press(screen.getByText('Undo'))
    expect(screen.getByText('Undo Last Turn')).toBeTruthy()
    await fireEvent.press(screen.getAllByText('Undo')[1]) // dialog confirm button
    expect(game.state.teams[0].score).toBe(0)
    expect(game.state.turnHistory).toHaveLength(0)
    expect(game.state.activeTeamIndex).toBe(0)
  })

  it('finishes automatically when the target score is reached', async () => {
    await renderGame({ targetScore: 1 })
    await startActiveTurn()
    await fireEvent.press(screen.getByText('Correct ✓'))
    await dispatch({ type: 'TIMER_EXPIRED' })
    await fireEvent.press(screen.getByText('End Turn →'))
    expect(game.state.phase).toBe('finished')
    expect(router.replace).toHaveBeenCalledWith('/results')
  })
})

describe('GameScreen — manual score editing', () => {
  it('long-pressing a team pill opens the editor and saves a new score', async () => {
    await renderGame()
    await fireEvent(screen.getByText('Blue'), 'longPress')
    expect(screen.getByText('Edit Score')).toBeTruthy()

    await fireEvent.changeText(screen.getByDisplayValue('0'), '7')
    await fireEvent.press(screen.getByText('Save'))
    expect(game.state.teams[1].score).toBe(7)
  })

  it('rejects invalid input and keeps the editor open', async () => {
    await renderGame()
    await fireEvent(screen.getByText('Blue'), 'longPress')
    await fireEvent.changeText(screen.getByDisplayValue('0'), 'abc')
    await fireEvent.press(screen.getByText('Save'))
    expect(screen.getByText('Edit Score')).toBeTruthy() // still open
    expect(game.state.teams[1].score).toBe(0)
  })
})

describe('GameScreen — chakra round', () => {
  it('runs a full chakra round with a points reward', async () => {
    await renderGame({ chakraReward: 2, chakraCardCount: 3 })
    await fireEvent.press(screen.getByText('☸ Chakra Round'))
    expect(screen.getByText('Chakra Round')).toBeTruthy()
    expect(game.state.phase).toBe('chakra')

    // Pick the second offered card (wrapper around the disabled GameCard)
    const chosen = game.state.chakraState!.cards[1]
    await fireEvent.press(screen.getByTestId(`game-card-${chosen.id}`).parent!)
    expect(game.state.chakraState!.phase).toBe('active')

    // Blue guesses first
    await fireEvent.press(screen.getByText('Blue'))
    expect(screen.getByText('+2 points')).toBeTruthy()

    await fireEvent.press(screen.getByText('Continue →'))
    expect(game.state.phase).toBe('playing')
    expect(game.state.teams[1].score).toBe(2)
    // Rotation advanced past the replaced turn
    expect(screen.getByText('Next up')).toBeTruthy()
  })

  it('extra-round reward queues a bonus turn for the winner', async () => {
    await renderGame({ chakraReward: 'extra-round' })
    await fireEvent.press(screen.getByText('☸ Chakra Round'))
    const chosen = game.state.chakraState!.cards[0]
    await fireEvent.press(screen.getByTestId(`game-card-${chosen.id}`).parent!)
    await fireEvent.press(screen.getByText('Blue'))
    await fireEvent.press(screen.getByText('Continue →'))

    // Blue (team-1) plays the bonus turn; rotation resumes with team-1's
    // original successor afterwards
    expect(screen.getByText('☸ Chakra Bonus Round')).toBeTruthy()
    expect(game.state.activeTeamIndex).toBe(1)
    expect(game.state.resumeTeamIndex).toBe(1)
    // The chakra trigger is hidden before a bonus turn
    expect(screen.queryByText('☸ Chakra Round')).toBeNull()
  })

  it('ending a chakra round with no winner simply advances play', async () => {
    await renderGame()
    await fireEvent.press(screen.getByText('☸ Chakra Round'))
    const chosen = game.state.chakraState!.cards[0]
    await fireEvent.press(screen.getByTestId(`game-card-${chosen.id}`).parent!)
    await fireEvent.press(screen.getByText('Nobody guessed it — end the round'))

    expect(game.state.phase).toBe('playing')
    expect(game.state.chakraState).toBeNull()
    expect(game.state.teams[0].score).toBe(0)
    expect(game.state.teams[1].score).toBe(0)
  })
})

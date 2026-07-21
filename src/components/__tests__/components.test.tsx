// =============================================================================
// Interaction tests for the game's building-block components.
// =============================================================================

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { CardStack } from '../card/CardStack'
import { CategoryBar } from '../ui/CategoryBar'
import { CountdownTimer } from '../ui/CountdownTimer'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { TeamScoreBar } from '../ui/TeamScoreBar'
import { BoardTrack } from '../board/BoardTrack'
import { ChakraRound } from '../chakra/ChakraRound'
import { CATEGORIES } from '@/constants/categories'
import { makeCard, makeDeck } from '@/testUtils/factories'
import type { ChakraState, Team } from '@/types/game'

const TEAMS: Team[] = [
  { id: 'team-0', name: 'Red Team', score: 3 },
  { id: 'team-1', name: 'Blue Team', score: 5 },
]

describe('CategoryBar', () => {
  it('renders all six categories and reports taps', async () => {
    const onSelect = jest.fn()
    await render(<CategoryBar selectedCategory={null} onSelect={onSelect} />)
    const boxes = screen.getAllByRole('button')
    expect(boxes).toHaveLength(CATEGORIES.length)
    await fireEvent.press(screen.getByRole('button', { name: 'People' }))
    expect(onSelect).toHaveBeenCalledWith('People')
  })

  it('ignores taps when not interactive', async () => {
    const onSelect = jest.fn()
    await render(
      <CategoryBar selectedCategory="People" onSelect={onSelect} interactive={false} />,
    )
    await fireEvent.press(screen.getByRole('button', { name: 'People' }))
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('CardStack', () => {
  const callbacks = () => ({
    onReveal: jest.fn(),
    onCorrect: jest.fn(),
    onVoid: jest.fn(),
    onSkip: jest.fn(),
  })

  it('asks to tap-to-reveal while waiting and fires onReveal', async () => {
    const cb = callbacks()
    await render(
      <CardStack
        cards={[makeCard('c1')]}
        phase="waiting"
        selectedCategory="People"
        correctIds={[]}
        voidedIds={[]}
        skipsRemaining={1}
        {...cb}
      />,
    )
    // No action buttons before reveal
    expect(screen.queryByText('Correct ✓')).toBeNull()
  })

  it('shows Skip and Correct during active play and fires the callbacks', async () => {
    const cb = callbacks()
    await render(
      <CardStack
        cards={[makeCard('c1')]}
        phase="active"
        selectedCategory="People"
        correctIds={[]}
        voidedIds={[]}
        skipsRemaining={1}
        {...cb}
      />,
    )
    await fireEvent.press(screen.getByText('Skip (1 left)'))
    expect(cb.onSkip).toHaveBeenCalledTimes(1)

    // Correct plays a fly-off animation first; the dispatch fires on completion
    await fireEvent.press(screen.getByText('Correct ✓'))
    await waitFor(() => expect(cb.onCorrect).toHaveBeenCalledWith('c1'), { timeout: 3000 })
  })

  it('hides Skip when no skips remain', async () => {
    const cb = callbacks()
    await render(
      <CardStack
        cards={[makeCard('c1'), makeCard('c2')]}
        phase="active"
        selectedCategory="People"
        correctIds={[]}
        voidedIds={[]}
        skipsRemaining={0}
        {...cb}
      />,
    )
    expect(screen.queryByText(/Skip/)).toBeNull()
  })

  it('fires onVoid only after the hold delay', async () => {
    const cb = callbacks()
    await render(
      <CardStack
        cards={[makeCard('c1')]}
        phase="active"
        selectedCategory="People"
        correctIds={[]}
        voidedIds={[]}
        skipsRemaining={1}
        {...cb}
      />,
    )
    const voidBtn = screen.getByText('Hold to Void')
    await fireEvent(voidBtn, 'pressIn')
    expect(cb.onVoid).not.toHaveBeenCalled() // not yet — hold in progress
    await waitFor(() => expect(cb.onVoid).toHaveBeenCalledWith('c1'), { timeout: 3000 })
  })

  it('releasing early cancels the void', async () => {
    const cb = callbacks()
    await render(
      <CardStack
        cards={[makeCard('c1')]}
        phase="active"
        selectedCategory="People"
        correctIds={[]}
        voidedIds={[]}
        skipsRemaining={1}
        {...cb}
      />,
    )
    const voidBtn = screen.getByText('Hold to Void')
    await fireEvent(voidBtn, 'pressIn')
    await fireEvent(voidBtn, 'pressOut') // released almost immediately
    await new Promise(r => setTimeout(r, 700))
    expect(cb.onVoid).not.toHaveBeenCalled()
  })

  it('voided cards show no action buttons', async () => {
    const cb = callbacks()
    await render(
      <CardStack
        cards={[makeCard('c1')]}
        phase="active"
        selectedCategory="People"
        correctIds={[]}
        voidedIds={['c1']}
        skipsRemaining={1}
        {...cb}
      />,
    )
    expect(screen.queryByText('Correct ✓')).toBeNull()
    expect(screen.queryByText('Hold to Void')).toBeNull()
  })
})

describe('CountdownTimer', () => {
  it('shows the full duration before the timer starts', async () => {
    await render(
      <CountdownTimer timerStartedAt={null} durationSeconds={60} onExpired={jest.fn()} />,
    )
    expect(screen.getByText('1:00')).toBeOnTheScreen()
  })

  it('formats sub-minute durations without minutes', async () => {
    await render(
      <CountdownTimer timerStartedAt={null} durationSeconds={45} onExpired={jest.fn()} />,
    )
    expect(screen.getByText('45')).toBeOnTheScreen()
  })
})

describe('ConfirmDialog', () => {
  it('fires confirm and cancel callbacks', async () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    await render(
      <ConfirmDialog
        visible
        title="End Game"
        message="Sure?"
        confirmLabel="End"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    await fireEvent.press(screen.getByText('End'))
    expect(onConfirm).toHaveBeenCalled()
    await fireEvent.press(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('TeamScoreBar', () => {
  it('shows every team with its score and reports long-presses', async () => {
    const onLongPress = jest.fn()
    await render(
      <TeamScoreBar
        teams={TEAMS}
        activeTeamId="team-0"
        targetScore={10}
        onLongPressTeam={onLongPress}
      />,
    )
    expect(screen.getByText('Red Team')).toBeOnTheScreen()
    expect(screen.getByText('Blue Team')).toBeOnTheScreen()
    // With a target score the chips read "score/target"
    expect(screen.getByText(/^3\/10$/)).toBeOnTheScreen()
    expect(screen.getByText(/^5\/10$/)).toBeOnTheScreen()

    await fireEvent(screen.getByText('Red Team'), 'longPress')
    expect(onLongPress).toHaveBeenCalledWith('team-0')
  })
})

describe('BoardTrack', () => {
  it('renders the full track with FINISH', async () => {
    await render(
      <BoardTrack teams={TEAMS} positions={[0, 3]} activeTeamIndex={0} turnActive />,
    )
    // Focused space (active team on space 0) shows the full category name
    expect(screen.getByText('Object')).toBeOnTheScreen()
  })
})

describe('ChakraRound', () => {
  const cards = makeDeck(3)
  const base = {
    teams: TEAMS,
    reward: 1 as const,
    onSelectCard: jest.fn(),
    onTeamWon: jest.fn(),
    onCancel: jest.fn(),
    onEndWithoutWinner: jest.fn(),
    onConfirmEnd: jest.fn(),
  }

  it('selecting phase: lists the cards and allows cancel', async () => {
    const chakraState: ChakraState = {
      phase: 'selecting', cards, selectedCard: null, winningTeamId: null,
    }
    await render(<ChakraRound chakraState={chakraState} {...base} />)
    expect(screen.getByText(/Pick a card/)).toBeOnTheScreen()
    await fireEvent.press(screen.getByText('← Cancel, back to normal turn'))
    expect(base.onCancel).toHaveBeenCalled()
  })

  it('hides cancel when the round is mandatory (board landing)', async () => {
    const chakraState: ChakraState = {
      phase: 'selecting', cards, selectedCard: null, winningTeamId: null,
    }
    await render(<ChakraRound chakraState={chakraState} {...base} allowCancel={false} />)
    expect(screen.queryByText(/Cancel — back/)).toBeNull()
  })

  it('active phase: tapping a team reports the winner', async () => {
    const chakraState: ChakraState = {
      phase: 'active', cards, selectedCard: cards[0], winningTeamId: null,
    }
    await render(<ChakraRound chakraState={chakraState} {...base} />)
    await fireEvent.press(screen.getByText('Blue Team'))
    expect(base.onTeamWon).toHaveBeenCalledWith('team-1')
    await fireEvent.press(screen.getByText(/Nobody guessed it/))
    expect(base.onEndWithoutWinner).toHaveBeenCalled()
  })

  it('ended phase: announces the winner and confirms', async () => {
    const chakraState: ChakraState = {
      phase: 'ended', cards, selectedCard: cards[0], winningTeamId: 'team-1',
    }
    await render(<ChakraRound chakraState={chakraState} {...base} />)
    expect(screen.getByText('Blue Team')).toBeOnTheScreen()
    expect(screen.getByText('+1 point')).toBeOnTheScreen()
    await fireEvent.press(screen.getByText('Continue →'))
    expect(base.onConfirmEnd).toHaveBeenCalled()
  })
})

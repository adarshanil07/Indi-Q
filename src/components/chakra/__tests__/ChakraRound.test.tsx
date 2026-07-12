// =============================================================================
// components/chakra/__tests__/ChakraRound.test.tsx
// The three Chakra phases: selecting, active, ended.
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { ChakraRound } from '../ChakraRound'
import { makeCards } from '@/test-utils/fixtures'
import type { ChakraState, Team } from '@/types/game'

const cards = makeCards(3)
const teams: Team[] = [
  { id: 'team-0', name: 'Red', score: 0 },
  { id: 'team-1', name: 'Blue', score: 2 },
]

async function renderRound(
  chakra: Partial<ChakraState>,
  props: Partial<React.ComponentProps<typeof ChakraRound>> = {},
) {
  const handlers = {
    onSelectCard: jest.fn(),
    onTeamWon: jest.fn(),
    onEndWithoutWinner: jest.fn(),
    onConfirmEnd: jest.fn(),
  }
  const chakraState: ChakraState = {
    phase: 'selecting',
    cards,
    selectedCard: null,
    winningTeamId: null,
    ...chakra,
  }
  await render(
    <ChakraRound
      chakraState={chakraState}
      teams={teams}
      reward={1}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('ChakraRound — selecting phase', () => {
  it('shows the pick-a-card prompt and every offered card', async () => {
    await renderRound({})
    expect(screen.getByText('Chakra Round')).toBeTruthy()
    expect(
      screen.getByText('Pick a card — you will describe its Chakra word while every team guesses!'),
    ).toBeTruthy()
    // All three cards are revealed — each shows its Movie word (chakraCategory)
    expect(screen.getByText('c1-Movie')).toBeTruthy()
    expect(screen.getByText('c2-Movie')).toBeTruthy()
    expect(screen.getByText('c3-Movie')).toBeTruthy()
  })

  it('reports the chosen card', async () => {
    const { onSelectCard } = await renderRound({})
    // The revealed GameCard itself is a disabled touchable — the tappable
    // element is the wrapper around it.
    const wrapper = screen.getByTestId('game-card-c2').parent!
    await fireEvent.press(wrapper)
    expect(onSelectCard).toHaveBeenCalledWith(cards[1])
  })
})

describe('ChakraRound — active phase', () => {
  const active: Partial<ChakraState> = { phase: 'active', selectedCard: cards[0] }

  it('shows the chosen card and a button per team', async () => {
    await renderRound(active)
    expect(screen.getByText('Describe the Chakra word. First team to guess it wins!')).toBeTruthy()
    expect(screen.getByText('Which team guessed it first?')).toBeTruthy()
    expect(screen.getByText('Red')).toBeTruthy()
    expect(screen.getByText('Blue')).toBeTruthy()
  })

  it('reports the winning team', async () => {
    const { onTeamWon } = await renderRound(active)
    await fireEvent.press(screen.getByText('Blue'))
    expect(onTeamWon).toHaveBeenCalledWith('team-1')
  })

  it('offers a no-winner escape hatch', async () => {
    const { onEndWithoutWinner } = await renderRound(active)
    await fireEvent.press(screen.getByText('Nobody guessed it — end the round'))
    expect(onEndWithoutWinner).toHaveBeenCalledTimes(1)
  })
})

describe('ChakraRound — ended phase', () => {
  const ended: Partial<ChakraState> = {
    phase: 'ended',
    selectedCard: cards[0],
    winningTeamId: 'team-1',
  }

  it('announces the winner and a singular point reward', async () => {
    await renderRound(ended, { reward: 1 })
    expect(screen.getByText('Chakra round won by')).toBeTruthy()
    expect(screen.getByText('Blue')).toBeTruthy()
    expect(screen.getByText('+1 point')).toBeTruthy()
  })

  it('pluralises multi-point rewards', async () => {
    await renderRound(ended, { reward: 3 })
    expect(screen.getByText('+3 points')).toBeTruthy()
  })

  it('describes the extra-round reward', async () => {
    await renderRound(ended, { reward: 'extra-round' })
    expect(screen.getByText('Blue plays a bonus round next!')).toBeTruthy()
  })

  it('confirms the end of the round', async () => {
    const { onConfirmEnd } = await renderRound(ended)
    await fireEvent.press(screen.getByText('Continue →'))
    expect(onConfirmEnd).toHaveBeenCalledTimes(1)
  })

  it('shows no winner announcement when no team won', async () => {
    await renderRound({
      phase: 'ended',
      selectedCard: cards[0],
      winningTeamId: null,
    })
    expect(screen.queryByText('Chakra round won by')).toBeNull()
  })
})

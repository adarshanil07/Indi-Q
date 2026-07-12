// =============================================================================
// components/card/__tests__/CardStack.test.tsx
// Per-phase button visibility and action wiring for the active card stack.
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { CardStack } from '../CardStack'
import { makeCard } from '@/test-utils/fixtures'

const c1 = makeCard('c1')
const c2 = makeCard('c2')

async function renderStack(props: Partial<React.ComponentProps<typeof CardStack>> = {}) {
  const handlers = {
    onReveal: jest.fn(),
    onCorrect: jest.fn(),
    onVoid: jest.fn(),
    onSkip: jest.fn(),
  }
  await render(
    <CardStack
      cards={[c1]}
      phase="active"
      selectedCategory="Movie"
      correctIds={[]}
      voidedIds={[]}
      skipsRemaining={1}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('CardStack — waiting phase', () => {
  it('shows no action buttons before reveal', async () => {
    await renderStack({ phase: 'waiting' })
    expect(screen.queryByText(/Skip/)).toBeNull()
    expect(screen.queryByText('Void')).toBeNull()
    expect(screen.queryByText('Correct ✓')).toBeNull()
  })

  it('routes the top card tap to onReveal', async () => {
    const { onReveal } = await renderStack({ phase: 'waiting' })
    await fireEvent.press(screen.getByTestId('game-card-c1'))
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('only the top card responds with reveal on a multi-card stack', async () => {
    const { onReveal } = await renderStack({ phase: 'waiting', cards: [c2, c1] })
    await fireEvent.press(screen.getByTestId('game-card-c1'))
    expect(onReveal).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByTestId('game-card-c2'))
    expect(onReveal).toHaveBeenCalledTimes(1)
  })
})

describe('CardStack — active phase', () => {
  it('shows Skip with the remaining count, Void, and Correct', async () => {
    await renderStack({ skipsRemaining: 2 })
    expect(screen.getByText('Skip (2 left)')).toBeTruthy()
    expect(screen.getByText('Void')).toBeTruthy()
    expect(screen.getByText('Correct ✓')).toBeTruthy()
  })

  it('hides Skip when no skips remain', async () => {
    await renderStack({ skipsRemaining: 0 })
    expect(screen.queryByText(/Skip/)).toBeNull()
  })

  it('wires Correct and Void to the card id', async () => {
    const { onCorrect, onVoid } = await renderStack()
    await fireEvent.press(screen.getByText('Correct ✓'))
    expect(onCorrect).toHaveBeenCalledWith('c1')
    await fireEvent.press(screen.getByText('Void'))
    expect(onVoid).toHaveBeenCalledWith('c1')
  })

  it('fires onSkip from the skip button', async () => {
    const { onSkip } = await renderStack()
    await fireEvent.press(screen.getByText('Skip (1 left)'))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('only offers Skip on the top card of a multi-card stack', async () => {
    await renderStack({ cards: [c2, c1] })
    // Both cards get Correct; only the top (index 0) gets Skip
    expect(screen.getAllByText('Correct ✓')).toHaveLength(2)
    expect(screen.queryAllByText(/Skip/)).toHaveLength(1)
  })

  it('disables Correct for a voided card', async () => {
    const { onCorrect } = await renderStack({ voidedIds: ['c1'] })
    await fireEvent.press(screen.getByText('Correct ✓'))
    expect(onCorrect).not.toHaveBeenCalled()
  })

  it('hides the Void button for an already-voided card', async () => {
    await renderStack({ voidedIds: ['c1'] })
    expect(screen.queryByText('Void')).toBeNull()
  })

  it('lower stacked cards can be marked correct independently', async () => {
    const { onCorrect } = await renderStack({ cards: [c2, c1] })
    await fireEvent.press(screen.getAllByText('Correct ✓')[1])
    expect(onCorrect).toHaveBeenCalledWith('c1')
  })
})

describe('CardStack — ended phase', () => {
  it('re-blurs the cards and allows last-second Correct only', async () => {
    await renderStack({ phase: 'ended' })
    expect(screen.getByText("TIME'S UP")).toBeTruthy()
    expect(screen.getByText('Correct ✓')).toBeTruthy()
    expect(screen.queryByText('Void')).toBeNull()
    expect(screen.queryByText(/Skip/)).toBeNull()
  })

  it('hides the action row for cards already marked correct', async () => {
    await renderStack({ phase: 'ended', correctIds: ['c1'] })
    expect(screen.queryByText('Correct ✓')).toBeNull()
  })
})

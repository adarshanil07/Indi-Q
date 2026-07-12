// =============================================================================
// app/__tests__/just-cards.test.tsx
// Just Cards browsing mode: counter, navigation, reshuffle at the end.
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import JustCardsScreen from '../just-cards'
import rawCards from '../../data/cards.json'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
)

const DECK_SIZE = (rawCards as unknown[]).length

describe('JustCardsScreen', () => {
  // The counter renders as nested Text — match on the combined string
  const counter = (n: number) => new RegExp(`^${n} / ${DECK_SIZE}$`)

  it('starts on card 1 of the full deck', async () => {
    await render(<JustCardsScreen />)
    expect(screen.getByText(counter(1))).toBeTruthy()
  })

  it('advances with the next arrow', async () => {
    await render(<JustCardsScreen />)
    await fireEvent.press(screen.getByText('→'))
    expect(screen.getByText(counter(2))).toBeTruthy()
  })

  it('goes back with the previous arrow', async () => {
    await render(<JustCardsScreen />)
    await fireEvent.press(screen.getByText('→'))
    await fireEvent.press(screen.getByText('→'))
    await fireEvent.press(screen.getByText('←'))
    expect(screen.getByText(counter(2))).toBeTruthy()
  })

  it('ignores previous on the first card', async () => {
    await render(<JustCardsScreen />)
    await fireEvent.press(screen.getByText('←'))
    expect(screen.getByText(counter(1))).toBeTruthy()
  })

  it('offers reshuffle on the last card and wraps back to 1', async () => {
    await render(<JustCardsScreen />)
    for (let i = 0; i < DECK_SIZE - 1; i++) {
      await fireEvent.press(screen.getByText('→'))
    }
    expect(screen.getByText(counter(DECK_SIZE))).toBeTruthy()
    // Last card shows the reshuffle glyph instead of the forward arrow
    expect(screen.queryByText('→')).toBeNull()
    await fireEvent.press(screen.getByText('↺'))
    expect(screen.getByText(counter(1))).toBeTruthy()
  })

  it('navigates back home', async () => {
    await render(<JustCardsScreen />)
    await fireEvent.press(screen.getByText('← Back'))
    expect(router.back).toHaveBeenCalledTimes(1)
  })
})

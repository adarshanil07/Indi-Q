// =============================================================================
// app/__tests__/how-to-play.test.tsx
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import HowToPlayScreen from '../how-to-play'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
)

describe('HowToPlayScreen', () => {
  it('renders every rule section', async () => {
    await render(<HowToPlayScreen />)
    expect(screen.getByText('How to Play')).toBeTruthy()
    for (const heading of [
      'Objective',
      'Taking a Turn',
      'Scoring',
      'Skip',
      'Void',
      'Timer',
      'Chakra Round',
      'Restart',
      'Undo',
    ]) {
      expect(screen.getByText(heading)).toBeTruthy()
    }
  })

  it('navigates back', async () => {
    await render(<HowToPlayScreen />)
    await fireEvent.press(screen.getByText('← Back'))
    expect(router.back).toHaveBeenCalledTimes(1)
  })
})

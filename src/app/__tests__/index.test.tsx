// =============================================================================
// app/__tests__/index.test.tsx
// Home screen: menu navigation.
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import HomeScreen from '../index'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
)

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers() // the ambient mandala spin loops forever
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders all four menu entries', async () => {
    await render(<HomeScreen />)
    expect(screen.getByText('Just Cards')).toBeTruthy()
    expect(screen.getByText('Full Game')).toBeTruthy()
    expect(screen.getByText('How to Play')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('routes each menu entry to its screen', async () => {
    await render(<HomeScreen />)
    await fireEvent.press(screen.getByText('Just Cards'))
    expect(router.push).toHaveBeenCalledWith('/just-cards')
    await fireEvent.press(screen.getByText('Full Game'))
    expect(router.push).toHaveBeenCalledWith('/setup')
    await fireEvent.press(screen.getByText('How to Play'))
    expect(router.push).toHaveBeenCalledWith('/how-to-play')
    await fireEvent.press(screen.getByText('Settings'))
    expect(router.push).toHaveBeenCalledWith('/settings')
  })
})

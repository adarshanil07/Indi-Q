// =============================================================================
// app/__tests__/settings.test.tsx
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import SettingsScreen from '../settings'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
)

describe('SettingsScreen', () => {
  it('renders the placeholder content', async () => {
    await render(<SettingsScreen />)
    expect(screen.getByText('Settings')).toBeTruthy()
    expect(screen.getByText('Settings coming soon')).toBeTruthy()
    expect(
      screen.getByText('Theme, sound effects, and premium options will live here.'),
    ).toBeTruthy()
  })

  it('navigates back', async () => {
    await render(<SettingsScreen />)
    await fireEvent.press(screen.getByText('← Back'))
    expect(router.back).toHaveBeenCalledTimes(1)
  })
})

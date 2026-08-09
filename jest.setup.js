// Shared Jest setup: mock native modules that have no JS-only implementation.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

// SafeAreaView renders nothing without native safe-area metrics — replace it
// with a plain View so screen content is reachable in tests.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react')
  const { View } = require('react-native')
  const insets = { top: 0, bottom: 0, left: 0, right: 0 }
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, style }) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 320, height: 640 }),
  }
})

// Slider is a purely native view — replace with a no-op host component.
jest.mock('@react-native-community/slider', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: (props) => React.createElement(View, { ...props, testID: props.testID ?? 'slider' }),
  }
})

// expo-router's imperative API — screens call router.push/replace/back directly.
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  // Stack.Screen is used to set per-screen navigation options (e.g. disabling
  // the iOS back gesture), so the mock needs the static too, not just Stack.
  Stack: Object.assign(() => null, { Screen: () => null }),
}))

// Splash screen is native-only.
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}))

// The Google Mobile Ads SDK is native-only. Screens import the app's own
// wrapper rather than the SDK, so mocking the wrapper keeps every screen test
// free of ad concerns — AdBanner renders nothing and the interstitial is inert.
// Haptics and audio are native-only; screens import the app's own wrapper, so
// mocking that keeps every screen test free of feedback concerns.
jest.mock('@/feedback', () => ({
  initialiseFeedback: jest.fn(),
  getFeedbackPrefs: () => ({ sound: true, haptics: true }),
  setFeedbackPrefs: jest.fn(),
  subscribeFeedbackPrefs: () => () => {},
  feedback: {
    tap: jest.fn(),
    select: jest.fn(),
    reveal: jest.fn(),
    correct: jest.fn(),
    skip: jest.fn(),
    voided: jest.fn(),
    win: jest.fn(),
  },
}))

jest.mock('@/ads', () => ({
  initialiseAds: jest.fn(),
  showPrivacyOptions: jest.fn(),
  useAdsReady: () => false,
  usePrivacyOptionsRequired: () => false,
  AdBanner: () => null,
  useGameEndInterstitial: () => ({ show: jest.fn() }),
}))

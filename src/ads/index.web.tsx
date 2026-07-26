// =============================================================================
// ads/index.web.tsx  (web)
// The Google Mobile Ads SDK is native-only, so the web bundle gets these no-op
// stubs instead. Metro resolves this file ahead of index.tsx on web, meaning
// the SDK is never imported there and `expo start --web` keeps working.
//
// Must mirror the exports of ads/index.tsx exactly.
// =============================================================================

import type { StyleProp, ViewStyle } from 'react-native'

export function initialiseAds(): void {
  // No ads on web.
}

export function AdBanner(_props: { style?: StyleProp<ViewStyle> }) {
  return null
}

export function useGameEndInterstitial(): { show: () => void } {
  return { show: () => {} }
}

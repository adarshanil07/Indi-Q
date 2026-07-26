// =============================================================================
// ads/index.tsx  (native)
// The only file in the app that imports the Google Mobile Ads SDK. Everything
// else imports { initialiseAds, AdBanner, useGameEndInterstitial } from '@/ads'
// and stays unaware of the provider — see ads/index.web.tsx for the web stubs
// that satisfy the same contract.
// =============================================================================

import { useCallback, useEffect, useRef } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import mobileAds, {
  BannerAd,
  BannerAdSize,
  TestIds,
  useInterstitialAd,
} from 'react-native-google-mobile-ads'
import {
  ADS_ENABLED,
  INTERSTITIAL_MIN_INTERVAL_MS,
  PROD_AD_UNIT_IDS,
  USE_TEST_ADS,
} from './config'

type UnitKind = 'banner' | 'interstitial'

/** Resolve the unit ID for this platform, forcing test ads unless truly live. */
function unitId(kind: UnitKind): string {
  if (USE_TEST_ADS) {
    return kind === 'banner' ? TestIds.ADAPTIVE_BANNER : TestIds.INTERSTITIAL
  }
  const ids = PROD_AD_UNIT_IDS[kind]
  return Platform.OS === 'ios' ? ids.ios : ids.android
}

/**
 * Start the Mobile Ads SDK. Called once from the root layout; safe to call
 * again. Failures are swallowed: no ad is ever worth crashing the game over.
 */
export function initialiseAds(): void {
  if (!ADS_ENABLED) return
  mobileAds()
    .initialize()
    .catch(() => {
      // Offline, or the SDK could not reach AdMob — play on without ads.
    })
}

/**
 * Anchored adaptive banner. Renders nothing when ads are off, so callers can
 * place it unconditionally. Sizing is left to the SDK, which picks a height
 * appropriate to the device width.
 */
export function AdBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  if (!ADS_ENABLED) return null
  return (
    <View style={[styles.banner, style]}>
      <BannerAd unitId={unitId('banner')} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  )
}

/**
 * Full-screen ad for the end of a game. Preloads on mount so the ad is ready
 * the moment the game finishes, and reloads itself after each showing.
 *
 * Returns a `show()` that is safe to call unconditionally — it silently does
 * nothing when ads are disabled, when no ad has loaded (offline, no fill), or
 * when the cooldown in config has not elapsed. Callers never need to branch,
 * and navigation must never wait on it.
 */
export function useGameEndInterstitial(): { show: () => void } {
  const { isLoaded, isClosed, load, show: showAd } = useInterstitialAd(unitId('interstitial'))
  const lastShownAt = useRef(0)

  useEffect(() => {
    if (ADS_ENABLED) load()
  }, [load])

  // Fetch the next ad as soon as the previous one is dismissed.
  useEffect(() => {
    if (isClosed) load()
  }, [isClosed, load])

  const show = useCallback(() => {
    if (!ADS_ENABLED || !isLoaded) return
    const now = Date.now()
    if (now - lastShownAt.current < INTERSTITIAL_MIN_INTERVAL_MS) return
    lastShownAt.current = now
    showAd()
  }, [isLoaded, showAd])

  return { show }
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

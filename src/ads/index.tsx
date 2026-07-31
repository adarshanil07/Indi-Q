// =============================================================================
// ads/index.tsx  (native)
// The only file in the app that imports the Google Mobile Ads SDK. Everything
// else imports from '@/ads' and stays unaware of the provider — see
// ads/index.web.tsx for the web stubs that satisfy the same contract.
//
// Consent comes first. Under GDPR the UMP form must be resolved BEFORE any ad
// is requested, so nothing renders an ad until initialiseAds() has gathered
// consent and reported that ads may be requested.
// =============================================================================

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  BannerAd,
  BannerAdSize,
  TestIds,
  useInterstitialAd,
} from 'react-native-google-mobile-ads'
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency'
import {
  ADS_ENABLED,
  INTERSTITIAL_MIN_INTERVAL_MS,
  PROD_AD_UNIT_IDS,
  USE_TEST_ADS,
} from './config'

type UnitKind = 'banner' | 'interstitial'

// ── Consent state ───────────────────────────────────────────────────────────
// A tiny external store rather than a Context: consent resolves once per
// launch, asynchronously, and several unrelated screens need to react to it
// without threading a provider through the tree.

let adsReady = false
let privacyOptionsRequired = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** True once consent allows ads AND the SDK has initialised. */
export function useAdsReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => adsReady,
    () => false,
  )
}

/**
 * True when this user must be offered a way to change their consent — EEA/UK
 * users, in practice. Settings hides the entry entirely for everyone else.
 */
export function usePrivacyOptionsRequired(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => privacyOptionsRequired,
    () => false,
  )
}

/**
 * Resolve the unit ID for this platform. Falls back to a test unit whenever
 * live ads have not been explicitly requested, or when this platform has no
 * real unit configured yet — so an unconfigured platform degrades to test ads
 * rather than requesting a live ad or rendering an empty slot.
 */
function unitId(kind: UnitKind): string {
  const testUnit = kind === 'banner' ? TestIds.ADAPTIVE_BANNER : TestIds.INTERSTITIAL
  if (USE_TEST_ADS) return testUnit
  const ids = PROD_AD_UNIT_IDS[kind]
  return (Platform.OS === 'ios' ? ids.ios : ids.android) || testUnit
}

/**
 * Gather consent, then start the Mobile Ads SDK. Called once from the root
 * layout.
 *
 * gatherConsent() presents the UMP form when one is required and does nothing
 * where it is not (most non-EEA users). Ads are only enabled if it reports
 * canRequestAds — which stays true when a user accepts a limited set of
 * purposes, in which case Google serves non-personalised ads.
 *
 * Any failure leaves ads off. That is deliberate: showing ads without having
 * resolved consent is the one outcome worth avoiding, and a game that quietly
 * runs ad-free is strictly better than a compliance problem.
 */
export async function initialiseAds(): Promise<void> {
  if (!ADS_ENABLED) return
  try {
    const info = await AdsConsent.gatherConsent()

    privacyOptionsRequired =
      info.privacyOptionsRequirementStatus ===
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    emit()

    if (!info.canRequestAds) return

    // iOS only: ask for the IDFA after the UMP form, per Google's ordering.
    // Declining is fine — it costs personalisation, not ads, so we carry on
    // either way. The ads SDK writes the Info.plist string but never requests
    // this itself, so it has to happen here.
    if (Platform.OS === 'ios') {
      await requestTrackingPermissionsAsync().catch(() => null)
    }

    await mobileAds().initialize()
    adsReady = true
    emit()
  } catch {
    // Offline, or consent could not be resolved — play on without ads.
  }
}

/**
 * Re-present the consent form so a user can change or withdraw what they
 * previously agreed to. GDPR requires withdrawal be as easy as granting, which
 * is why Settings surfaces this.
 */
export async function showPrivacyOptions(): Promise<void> {
  try {
    await AdsConsent.showPrivacyOptionsForm()
  } catch {
    // Form unavailable or dismissed — nothing to recover from.
  }
}

/**
 * Anchored adaptive banner. Renders nothing until consent allows ads, so
 * callers can place it unconditionally. Sizing is left to the SDK, which picks
 * a height appropriate to the device width.
 */
export function AdBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const ready = useAdsReady()
  if (!ADS_ENABLED || !ready) return null
  return (
    <View style={[styles.banner, style]}>
      <BannerAd unitId={unitId('banner')} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  )
}

/**
 * Full-screen ad for the end of a game. Preloads once consent allows, so the
 * ad is ready the moment the game finishes, and reloads after each showing.
 *
 * Returns a `show()` that is safe to call unconditionally — it silently does
 * nothing when ads are disabled or unconsented, when no ad has loaded (offline,
 * no fill), or when the cooldown in config has not elapsed. Callers never need
 * to branch, and navigation must never wait on it.
 */
export function useGameEndInterstitial(): { show: () => void } {
  const ready = useAdsReady()
  const { isLoaded, isClosed, load, show: showAd } = useInterstitialAd(unitId('interstitial'))
  const lastShownAt = useRef(0)

  useEffect(() => {
    if (ADS_ENABLED && ready) load()
  }, [ready, load])

  // Fetch the next ad as soon as the previous one is dismissed.
  useEffect(() => {
    if (isClosed && ready) load()
  }, [isClosed, ready, load])

  const show = useCallback(() => {
    if (!ADS_ENABLED || !ready || !isLoaded) return
    const now = Date.now()
    if (now - lastShownAt.current < INTERSTITIAL_MIN_INTERVAL_MS) return
    lastShownAt.current = now
    showAd()
  }, [ready, isLoaded, showAd])

  return { show }
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

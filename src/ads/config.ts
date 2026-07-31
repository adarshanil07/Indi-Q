// =============================================================================
// ads/config.ts
// Ad gating and pacing. Deliberately free of any react-native-google-mobile-ads
// import so it stays safe to read from web and test code — the native SDK is
// only ever touched from ads/index.tsx.
// =============================================================================

/**
 * Master switch for every ad in the app. A future "remove ads" purchase only
 * has to flip this (or the state that feeds it) — no screen imports the ad SDK
 * directly, so nothing else needs to change.
 */
export const ADS_ENABLED = true

/**
 * Real AdMob unit IDs from the AdMob console. A blank entry means that
 * platform has no unit yet and transparently falls back to a test ad, so a
 * half-configured platform can never request a live ad or render nothing.
 */
export const PROD_AD_UNIT_IDS = {
  banner: {
    android: 'ca-app-pub-9280199166759720/6398250326',
    ios: 'ca-app-pub-9280199166759720/6686647059',
  },
  interstitial: {
    android: 'ca-app-pub-9280199166759720/4920562839',
    ios: 'ca-app-pub-9280199166759720/4571885531',
  },
} as const

/**
 * Live ads are opt-in per build profile rather than merely "not development".
 *
 * Only eas.json's `production` profile sets EXPO_PUBLIC_USE_LIVE_ADS, so both
 * development AND internal `preview` builds stay on test ads. That distinction
 * matters: preview builds are the ones handed round for testing, and tapping a
 * LIVE ad in your own app is grounds for a permanent AdMob ban. Gating on
 * __DEV__ alone would have left preview builds serving real ads.
 */
const LIVE_ADS_REQUESTED = process.env.EXPO_PUBLIC_USE_LIVE_ADS === 'true'

export const USE_TEST_ADS = __DEV__ || !LIVE_ADS_REQUESTED

/**
 * Floor on the gap between two interstitials. The game shows one at the end of
 * every game by design; this only suppresses pathological bursts (a game ended
 * early, restarted, and ended again within seconds), which is both hostile to
 * players and the kind of pattern AdMob throttles ad serving for.
 */
export const INTERSTITIAL_MIN_INTERVAL_MS = 90_000

/**
 * How long the results screen waits before showing its interstitial, giving
 * the winner announcement and confetti time to land first.
 */
export const INTERSTITIAL_DELAY_MS = 2_000

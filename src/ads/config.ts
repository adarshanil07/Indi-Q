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
 * Real AdMob unit IDs, filled in from the AdMob console. Left blank until the
 * account exists; while they are blank the app serves Google's test ads on
 * every build (see USE_TEST_ADS).
 */
export const PROD_AD_UNIT_IDS = {
  banner: { android: '', ios: '' },
  interstitial: { android: '', ios: '' },
} as const

/**
 * Test ads are used unless this is a production build AND real unit IDs have
 * been supplied. This is a safety interlock, not a convenience: tapping a LIVE
 * ad in your own app is grounds for a permanent AdMob ban, so development
 * builds must never be able to request one.
 */
export const USE_TEST_ADS =
  __DEV__ || PROD_AD_UNIT_IDS.banner.android === '' || PROD_AD_UNIT_IDS.interstitial.android === ''

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

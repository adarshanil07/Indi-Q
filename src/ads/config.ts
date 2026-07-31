// =============================================================================
// ads/config.ts
// Ad gating and pacing. Deliberately free of any react-native-google-mobile-ads
// import so it stays safe to read from web and test code — the native SDK is
// only ever touched from ads/index.tsx.
// =============================================================================

import * as Updates from 'expo-updates'

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
 * Live ads are served only by production builds. Development and internal
 * preview builds stay on test ads, because those are the ones handed round for
 * testing and tapping a LIVE ad in your own app is grounds for a permanent
 * AdMob ban. Gating on __DEV__ alone would leave preview builds serving real
 * ads, since they are not development builds.
 *
 * The signal is the EAS channel rather than an EXPO_PUBLIC_ env var. That
 * matters for over-the-air updates: env vars are inlined when a bundle is
 * built, and `eas update` resolves them from server-side EAS variables rather
 * than eas.json's build profiles. An update published without the variable set
 * would therefore have flipped a live production app back to test ads and
 * silently stopped it earning.
 *
 * Updates.channel is compiled into the native build instead, so it keeps
 * reporting "production" no matter what JS bundle is loaded on top. A build
 * with no channel (null) falls back to test ads, which is the safe default.
 */
export const USE_TEST_ADS = __DEV__ || Updates.channel !== 'production'

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

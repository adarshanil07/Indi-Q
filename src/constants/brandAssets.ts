// =============================================================================
// constants/brandAssets.ts
// Single source of truth for brand artwork shared by the intro sequence and
// the Home screen, plus their source aspect ratios and brand colours.
// =============================================================================

export const BRAND_ASSETS = {
  // EnJoy Games splash layers (kept separate so they can stagger in)
  egMonkey: require('@/assets/intro/eg-monkey.png'),
  egWordmark: require('@/assets/intro/eg-wordmark.png'),
  egTagline: require('@/assets/intro/eg-tagline.png'),

  // INDI-Q brand layers (originals from the design Images folder)
  iqBorderTop: require('@/assets/intro/iq-border-top.png'),
  iqBorderBottom: require('@/assets/intro/iq-border-bottom.png'),
  iqMandala: require('@/assets/intro/iq-mandala.png'),
  iqLogo: require('@/assets/intro/iq-logo.png'),
}

/** Source-art aspect ratios (w/h) — used to derive heights from widths. */
export const BRAND_AR = {
  monkey: 394 / 321,
  wordmark: 598 / 86,
  tagline: 311 / 29,
  borderTop: 834 / 319,
  borderBottom: 834 / 320,
  logo: 518 / 195,
  mandala: 549 / 537,
}

export const BRAND_COLOURS = {
  /** INDI-Q backdrop orange */
  orange: '#FF9B00',
  /** EnJoy Games splash yellow */
  yellow: '#f7ef4c',
  /** Dark ink used on light buttons */
  ink: '#1A1A1A',
  /** Warm cream "table" background used on play screens */
  cream: '#FFF6E3',
  /** Warm brown for secondary text on cream */
  hint: '#6B5B3E',
}

// =============================================================================
// components/intro/IntroSequence.tsx
// Branded opening sequence, played as a full-screen overlay on cold start.
//
// The INDI-Q brand screen is the Home screen itself, so this overlay only
// covers the EnJoy Games phase — the orange circular reveal at the end
// exposes the real Home screen (same orange, mandala already turning), then
// the overlay fades away and unmounts.
//
//   Timeline (ms)
//     120   EnJoy monkey pops in (yellow screen)
//     440   ENJOY GAMES wordmark rises
//     700   MAKE IT MALLU tagline settles; loading bar fills
//     2050  orange circle expands from centre
//     2800  overlay fades → onDone (unmount)
//
// Tap anywhere to skip.
// =============================================================================

import { useEffect, useRef } from 'react'
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { BRAND_AR, BRAND_ASSETS, BRAND_COLOURS } from '@/constants/brandAssets'

interface Props {
  onDone: () => void
}

export function IntroSequence({ onDone }: Props) {
  const { width: W, height: H } = useWindowDimensions()
  const doneRef = useRef(false)

  // ── Animated values ────────────────────────────────────────────────
  const monkeyIn = useRef(new Animated.Value(0)).current
  const wordIn = useRef(new Animated.Value(0)).current
  const tagIn = useRef(new Animated.Value(0)).current
  const barFill = useRef(new Animated.Value(0)).current
  const orangeIn = useRef(new Animated.Value(0)).current
  const fadeOut = useRef(new Animated.Value(1)).current

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    const timing = (v: Animated.Value, ms: number, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue: 1, duration: ms, easing, useNativeDriver: true })

    const seq = Animated.parallel([
      Animated.sequence([Animated.delay(120), timing(monkeyIn, 620, Easing.out(Easing.back(1.7)))]),
      Animated.sequence([Animated.delay(440), timing(wordIn, 500)]),
      Animated.sequence([Animated.delay(700), timing(tagIn, 500)]),
      Animated.sequence([Animated.delay(150), timing(barFill, 1950, Easing.inOut(Easing.ease))]),
      Animated.sequence([Animated.delay(2050), timing(orangeIn, 620, Easing.inOut(Easing.cubic))]),
      Animated.sequence([
        Animated.delay(2800),
        Animated.timing(fadeOut, {
          toValue: 0, duration: 320, easing: Easing.in(Easing.ease), useNativeDriver: true,
        }),
      ]),
    ])
    seq.start(({ finished }) => {
      if (finished) finish()
    })

    return () => seq.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived layout ─────────────────────────────────────────────────
  // EnJoy Games cluster: prototype geometry (598×477 container) scaled to screen
  const egW = Math.min(W * 0.82, 420)
  const s = egW / 598
  const egH = 477 * s
  const egTop = (H - egH) / 2 - H * 0.03

  const monkeyW = 394 * s
  const monkeyLeft = 153 * s
  const wordTop = 370 * s
  const tagTop = 448 * s
  const tagLeft = 143 * s
  const tagW = 311 * s

  // Orange reveal circle: big enough to cover the whole screen from centre
  const circleD = Math.sqrt(W * W + H * H) * 1.05

  return (
    <Animated.View style={[styles.root, { opacity: fadeOut }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish}>
        {/* ── EnJoy Games screen ─────────────────────────────────── */}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="egBg" cx="50%" cy="44%" r="75%">
              <Stop offset="0%" stopColor="#fcf472" />
              <Stop offset="52%" stopColor="#f7ef4c" />
              <Stop offset="100%" stopColor="#ecdc24" />
            </RadialGradient>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <Stop offset="65%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={H} fill="url(#egBg)" />
          <Circle cx={W / 2} cy={egTop + (321 * s) / 2} r={W * 0.34} fill="url(#glow)" />
        </Svg>

        {/* Monkey */}
        <Animated.Image
          source={BRAND_ASSETS.egMonkey}
          style={{
            position: 'absolute',
            left: (W - egW) / 2 + monkeyLeft,
            top: egTop,
            width: monkeyW,
            height: monkeyW / BRAND_AR.monkey,
            opacity: monkeyIn,
            transform: [
              { scale: monkeyIn.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] }) },
              { translateY: monkeyIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            ],
          }}
          resizeMode="contain"
        />

        {/* ENJOY GAMES wordmark */}
        <Animated.Image
          source={BRAND_ASSETS.egWordmark}
          style={{
            position: 'absolute',
            left: (W - egW) / 2,
            top: egTop + wordTop,
            width: egW,
            height: egW / BRAND_AR.wordmark,
            opacity: wordIn,
            transform: [
              { translateY: wordIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            ],
          }}
          resizeMode="contain"
        />

        {/* MAKE IT MALLU tagline */}
        <Animated.Image
          source={BRAND_ASSETS.egTagline}
          style={{
            position: 'absolute',
            left: (W - egW) / 2 + tagLeft,
            top: egTop + tagTop,
            width: tagW,
            height: tagW / BRAND_AR.tagline,
            opacity: tagIn,
            transform: [
              { scale: tagIn.interpolate({ inputRange: [0, 1], outputRange: [1.07, 1] }) },
            ],
          }}
          resizeMode="contain"
        />

        {/* Loading bar */}
        <Animated.View style={[styles.barTrack, { bottom: H * 0.1, left: W / 2 - 59, opacity: monkeyIn }]}>
          <Animated.View style={[styles.barFill, { transform: [{ scaleX: barFill }] }]} />
        </Animated.View>

        {/* ── Orange circular reveal (lands on the Home screen) ──── */}
        <Animated.View
          style={{
            position: 'absolute',
            left: W / 2 - circleD / 2,
            top: H / 2 - circleD / 2,
            width: circleD,
            height: circleD,
            borderRadius: circleD / 2,
            backgroundColor: BRAND_COLOURS.orange,
            transform: [
              { scale: orangeIn.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] }) },
            ],
          }}
        />
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: BRAND_COLOURS.yellow,
  },
  barTrack: {
    position: 'absolute',
    width: 118,
    height: 3,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(40,32,0,0.14)',
  },
  barFill: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2a2418',
    transformOrigin: 'left',
  },
})

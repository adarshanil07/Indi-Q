// =============================================================================
// app/just-cards.tsx — Just Cards mode
// The digital replacement for the physical deck: one card at a time, prev /
// next navigation, nothing else. Players run scoring and rules themselves.
//
//   • Language toggle (EN | മ) swaps which language is the card's main text;
//     the choice is persisted across sessions.
//   • Nav buttons are "card tiles" — the card's own visual language (flat
//     colour, chunky black border, rounded corners).
//   • Cards are dealt: next slides in from the right with a slight rotation
//     that settles flat; prev mirrors the motion. Buttons are locked during
//     the ~300ms animation so double-taps can't desync the deck.
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { AdBanner } from '@/ads'
import { GameCard } from '@/components/card/GameCard'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { BRAND_COLOURS } from '@/constants/brandAssets'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { loadCardLanguage, saveCardLanguage, type CardLanguage } from '@/utils/prefs'
import type { Card } from '@/types/game'
import rawCards from '../data/cards.json'

const ALL_CARDS = rawCards as Card[]

// Must match aspectRatio in GameCard — physical card is 703×502 (landscape)
const CARD_ASPECT = 703 / 502

const CREAM = '#FFF6E3'
// Nav buttons are miniature playing cards at the same aspect ratio as the
// real card, so they never feel like a foreign UI element next to it.
const MINI_CARD_W = 100
const MINI_CARD_H = MINI_CARD_W / CARD_ASPECT
const SLIDE_OUT_MS = 140
const SLIDE_IN_MS = 210

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function JustCardsScreen() {
  const { width: screenW } = useWindowDimensions()
  const [deck, setDeck] = useState<Card[]>(() => shuffled(ALL_CARDS))
  const [index, setIndex] = useState(0)
  const [language, setLanguage] = useState<CardLanguage>('en')
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 })

  // Restore the persisted language choice
  useEffect(() => {
    loadCardLanguage().then(l => l && setLanguage(l))
  }, [])

  const setLang = (l: CardLanguage) => {
    setLanguage(l)
    saveCardLanguage(l)
  }

  const card = deck[index]
  const isFirst = index === 0
  const isLast = index === deck.length - 1

  const cardWidth =
    areaSize.h > 0 ? Math.min(areaSize.w, areaSize.h * CARD_ASPECT) : 0

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setAreaSize({ w: width, h: height })
  }

  // ── Card dealing animation ─────────────────────────────────────────
  // slide: -1 = fully off-screen left, 0 = centred, +1 = off-screen right.
  // A slight rotation follows the slide so the motion reads as a physical
  // card being dealt, not a screen transition.
  const slide = useRef(new Animated.Value(0)).current
  const animating = useRef(false)

  const dealTo = (direction: 1 | -1, swap: () => void) => {
    if (animating.current) return
    animating.current = true
    Animated.timing(slide, {
      toValue: -direction,
      duration: SLIDE_OUT_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      swap()
      slide.setValue(direction)
      Animated.timing(slide, {
        toValue: 0,
        duration: SLIDE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        animating.current = false
      })
    })
  }

  const goNext = () =>
    dealTo(1, () => {
      if (isLast) {
        setDeck(shuffled(ALL_CARDS))
        setIndex(0)
      } else {
        setIndex(i => i + 1)
      }
    })

  const goPrev = () => {
    if (isFirst) return
    dealTo(-1, () => setIndex(i => i - 1))
  }

  // ── Swipe: the card follows the finger, tilting as it moves ────────
  // Swipe left → next; swipe right → previous. Release past 30% of the
  // screen width (or a quick flick) completes the deal; anything less
  // springs back. On the first card a rightward drag rubber-bands.
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      !animating.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderMove: (_, g) => {
      if (animating.current) return
      let dx = g.dx
      if (isFirst && dx > 0) dx *= 0.25 // rubber-band: no previous card to go to
      slide.setValue(dx / screenW)
    },
    onPanResponderRelease: (_, g) => {
      if (animating.current) return
      const frac = g.dx / screenW
      if (frac < -0.3 || g.vx < -0.8) {
        goNext()
      } else if ((frac > 0.3 || g.vx > 0.8) && !isFirst) {
        goPrev()
      } else {
        Animated.spring(slide, { toValue: 0, friction: 7, useNativeDriver: true }).start()
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(slide, { toValue: 0, friction: 7, useNativeDriver: true }).start()
    },
  })

  const translateX = slide.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-screenW, 0, screenW],
  })
  const rotate = slide.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-2.5deg', '0deg', '2.5deg'],
  })

  return (
    <SafeAreaView style={styles.container}>
      {/* The card swipe spans the whole screen, so iOS's swipe-to-go-back
          gesture fires on the same drag and pops the screen mid-deal. Only
          this screen disables it; the Back button above remains the way out. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      {/* Top bar: Back · language toggle · counter */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <LanguageToggle language={language} onChange={setLang} />

        <Text style={styles.counter}>
          {index + 1}
          <Text style={styles.counterOf}> / {deck.length}</Text>
        </Text>
      </View>

      {/* Banner sits under the top bar, deliberately far from the nav tiles at
          the bottom — an ad beneath a repeatedly-tapped control invites
          accidental clicks, which is both bad for players and an AdMob
          policy risk. */}
      <AdBanner />

      {/* Card area */}
      <View style={styles.cardArea} onLayout={onAreaLayout}>
        {cardWidth > 0 && (
          <Animated.View
            {...panResponder.panHandlers}
            style={{ width: cardWidth, transform: [{ translateX }, { rotate }] }}
          >
            <GameCard
              card={card}
              isRevealed={true}
              isVoided={false}
              selectedCategory={null}
              primaryLanguage={language}
            />
          </Animated.View>
        )}
      </View>

      {/* Navigation tiles */}
      <View style={styles.nav}>
        <NavTile direction="left" disabled={isFirst} onPress={goPrev} />
        <NavTile direction="right" reshuffle={isLast} onPress={goNext} />
      </View>
    </SafeAreaView>
  )
}

// ── Navigation glyphs ───────────────────────────────────────────────────────
// Drawn as vectors rather than the ←/→/↺ characters. Those come from the
// platform's system font — Roboto on Android, San Francisco on iOS and the
// web — so their stroke weight, proportions and vertical centring all shifted
// between platforms, and the heavy weight they were set in was synthesised
// rather than real. Paths render identically everywhere.

function ArrowIcon({
  direction,
  size = 26,
  color,
}: {
  direction: 'left' | 'right'
  size?: number
  color: string
}) {
  // Both directions are drawn explicitly rather than rotating one with <G>:
  // react-native-svg renders that rotation as an invalid DOM attribute on web.
  const d = direction === 'left' ? 'M14.5 5 L7.5 12 L14.5 19' : 'M9.5 5 L16.5 12 L9.5 19'
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Reshuffle: a near-complete circle with an arrowhead, replacing ↺. */
function ReshuffleIcon({ size = 26, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12 a8 8 0 1 1 -2.5 -5.8"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 3.5 V7 h-3.5"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Mini playing card navigation button ─────────────────────────────────────
// A tiny replica of the real card's construction: white body, black border,
// one coloured row (Movie-orange for nav, Nature-green for reshuffle) with
// the arrow set inside it — a miniature card, not a generic icon button.

function NavTile({
  direction,
  onPress,
  disabled = false,
  reshuffle = false,
}: {
  direction: 'left' | 'right'
  onPress: () => void
  disabled?: boolean
  reshuffle?: boolean
}) {
  const stripeColour = disabled
    ? '#E4D9BC'
    : reshuffle
      ? CATEGORY_COLOURS.Nature
      : CATEGORY_COLOURS.Movie

  const arrowColour = disabled ? 'rgba(0,0,0,0.3)' : '#000000'

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.miniCard,
        disabled && styles.miniCardDisabled,
        pressed && !disabled && styles.miniCardPressed,
      ]}
    >
      <View style={[styles.miniStripe, { backgroundColor: stripeColour }]}>
        {reshuffle ? (
          <ReshuffleIcon color={arrowColour} />
        ) : (
          <ArrowIcon direction={direction} color={arrowColour} />
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },

  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
    minWidth: 74,
  },
  backText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: '#6B5B3E',
  },
  counter: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 22,
    color: BRAND_COLOURS.ink,
    minWidth: 74,
    textAlign: 'right',
  },
  counterOf: {
    fontFamily: 'BalooChettan2_700Bold',
    color: '#B4A582',
  },


  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  nav: {
    height: MINI_CARD_H + 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 36,
  },
  miniCard: {
    width: MINI_CARD_W,
    height: MINI_CARD_H,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    padding: 5,
    justifyContent: 'center',
    shadowColor: '#7a4a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 5,
  },
  miniCardPressed: {
    transform: [{ scale: 0.94 }, { translateY: 2 }],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    elevation: 2,
  },
  miniCardDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  miniStripe: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 2.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

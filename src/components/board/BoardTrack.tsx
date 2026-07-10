// =============================================================================
// components/board/BoardTrack.tsx
// The digital board as one continuous horizontal band floating directly on
// the cream table: joined colour stripes with thin black dividers, a slim
// outline along the band, rounded end caps — no containing box.
//
//   • ALL text runs vertically (reads downward), so a stripe growing from
//     letter to full word is seamless.
//   • The walking team's stripe ENLARGES as their dot crosses it, one space
//     at a time, pushing neighbouring stripes outward — then settles on the
//     destination stripe showing the full category name.
//   • Scrolls by dragging the board itself on every platform (a PanResponder
//     backfills mouse-drag on web, where ScrollView ignores the cursor).
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import {
  LayoutAnimation,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import type { Team } from '@/types/game'
import { Chakra } from '@/components/card/Chakra'
import { BOARD_SPACES, CATEGORY_LETTERS, spaceAt } from '@/constants/board'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { teamColourAt } from '@/constants/teams'

const STRIPE_W = 30      // small stripe width
const STRIPE_H = 56      // band height
const STRIPE_BIG_W = 46  // enlarged (walking/current) stripe
const STRIPE_BIG_H = 76  // enlarged stripe drops below the band
const STEP_MS = 300
const FINISH_GOLD = '#E8B93B'

interface Props {
  teams: Team[]
  positions: number[]
  activeTeamIndex: number
}

export function BoardTrack({ teams, positions, activeTeamIndex }: Props) {
  const { width: screenW } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)

  // displayPositions trail the real ones, stepping one space at a time so
  // the dot visibly walks — the stripe underneath it grows as it crosses.
  const [displayPositions, setDisplayPositions] = useState(positions)
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayPositions(current => {
        let changed = false
        const next = current.map((p, i) => {
          const target = positions[i] ?? 0
          if (p < target) { changed = true; return p + 1 }
          if (p > target) { changed = true; return target } // undo: jump back
          return p
        })
        if (changed) {
          LayoutAnimation.configureNext(
            LayoutAnimation.create(STEP_MS - 80, 'easeInEaseOut', 'opacity'),
          )
          return next
        }
        return current
      })
    }, STEP_MS)
    return () => clearInterval(interval)
  }, [positions])

  // The enlargement follows whoever is currently WALKING; otherwise it sits
  // with the active team.
  const walkingIdx = displayPositions.findIndex((p, i) => p !== (positions[i] ?? 0))
  const focusIdx = walkingIdx >= 0 ? walkingIdx : activeTeamIndex
  const focusPos = displayPositions[focusIdx] ?? 0

  // Keep the focused stripe centred as it walks. Fires only when the walked
  // position changes, so manual dragging is never fought.
  useEffect(() => {
    const x = focusPos * STRIPE_W - screenW / 2 + STRIPE_BIG_W / 2
    scrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true })
  }, [focusPos, screenW])

  // Web: ScrollView ignores mouse-drag — drive it with a PanResponder.
  const scrollX = useRef(0)
  const dragStart = useRef(0)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x
  }
  const webDrag = useRef(
    Platform.OS === 'web'
      ? PanResponder.create({
          onMoveShouldSetPanResponder: (_, g) =>
            Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
          onPanResponderGrant: () => {
            dragStart.current = scrollX.current
          },
          onPanResponderMove: (_, g) => {
            scrollRef.current?.scrollTo({
              x: Math.max(0, dragStart.current - g.dx),
              animated: false,
            })
          },
        })
      : null,
  ).current

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={styles.strip}
      contentContainerStyle={styles.content}
    >
      <View style={styles.band} {...(webDrag ? webDrag.panHandlers : {})}>
        {BOARD_SPACES.map((space, index) => {
          const isFocused = index === focusPos
          const teamsHere = displayPositions
            .map((p, i) => (p === index ? i : -1))
            .filter(i => i >= 0)

          const bg =
            space.type === 'category'
              ? CATEGORY_COLOURS[space.category]
              : space.type === 'finish'
                ? FINISH_GOLD
                : '#FFFFFF'

          return (
            <View
              key={index}
              style={[
                styles.stripe,
                { backgroundColor: bg },
                index === 0 && styles.stripeFirst,
                index === BOARD_SPACES.length - 1 && styles.stripeLast,
                isFocused && styles.stripeFocused,
              ]}
            >
              {/* All labels run downward so small → large is seamless */}
              {space.type === 'category' && (
                <VerticalLabel
                  text={isFocused ? space.category : CATEGORY_LETTERS[space.category]}
                  boxHeight={(isFocused ? STRIPE_BIG_H : STRIPE_H) - 20}
                />
              )}
              {space.type === 'chakra' && (
                <Chakra size={isFocused ? 30 : 20} bgColor="#FFFFFF" />
              )}
              {space.type === 'finish' && (
                <VerticalLabel
                  text={isFocused ? 'FINISH' : '🏁'}
                  boxHeight={(isFocused ? STRIPE_BIG_H : STRIPE_H) - 20}
                />
              )}

              {/* Team pieces on this space */}
              {teamsHere.length > 0 && (
                <View style={styles.dotRow}>
                  {teamsHere.map(i => (
                    <View
                      key={teams[i].id}
                      style={[
                        styles.dot,
                        { backgroundColor: teamColourAt(i) },
                        i === focusIdx && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

// Text rotated 90° so it reads downwards along the stripe, like the words on
// the physical Articulate wheel. The rotated text's width becomes its visual
// height, so it is sized to the available stripe height.
function VerticalLabel({ text, boxHeight }: { text: string; boxHeight: number }) {
  return (
    <View style={vertStyles.wrap} pointerEvents="none">
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[vertStyles.text, { width: boxHeight }]}
      >
        {text}
      </Text>
    </View>
  )
}

/** Whether a board position is a ☸ space (used by game logic callers). */
export function isChakraSpace(position: number): boolean {
  return spaceAt(position).type === 'chakra'
}

const styles = StyleSheet.create({
  strip: {
    flexGrow: 0,
  },
  content: {
    alignItems: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  // The band is just the stripes themselves: thin outline top/bottom via each
  // stripe, dividers between them, rounded caps at the ends. No outer box —
  // the colours sit directly on the cream.
  band: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stripe: {
    width: STRIPE_W,
    height: STRIPE_H,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 3,
  },
  stripeFirst: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  stripeLast: {
    borderRightWidth: 2,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  // The focused stripe grows in place, pushing its neighbours outward.
  stripeFocused: {
    width: STRIPE_BIG_W,
    height: STRIPE_BIG_H,
    borderWidth: 2.5,
    borderRadius: 10,
  },
  dotRow: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  dotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
})

const vertStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
    transform: [{ rotate: '90deg' }],
  },
})

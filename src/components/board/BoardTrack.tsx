// =============================================================================
// components/board/BoardTrack.tsx
// The digital board: a big horizontal chain of gently-rounded colour segments
// floating on the cream table (no containing box).
//
//   • ALL text runs vertically (reads downward), so a stripe growing from
//     letter to full word is seamless.
//   • After a move, the team's dot walks one space at a time; the stripe
//     under it GROWS as it crosses (Animated sizes — works on web too, where
//     LayoutAnimation silently does nothing) and pushes its neighbours
//     outward, settling enlarged on the destination.
//   • Scrolls by dragging the board itself on every platform (a PanResponder
//     backfills mouse-drag on web, where ScrollView ignores the cursor).
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
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
import { BOARD_SPACES, CATEGORY_LETTERS, spaceAt, type BoardSpace } from '@/constants/board'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { teamColourAt } from '@/constants/teams'

const STRIPE_W = 42       // small segment width
const STRIPE_H = 84       // band height
const STRIPE_BIG_W = 62   // enlarged (walking/current) segment
const STRIPE_BIG_H = 116  // enlarged segment drops below the band
const SEG_GAP = 3         // gap between rounded segments
export const WALK_STEP_MS = 340 // one walk step (exported for walk-timing holds)
const STEP_MS = WALK_STEP_MS
const GROW_MS = 220       // segment grow/shrink
const FINISH_GOLD = '#E8B93B'

/**
 * One walk step: every team whose displayed position trails its target moves
 * forward ONE space; a team past its target (undo) snaps back. Returns null
 * when nothing changed. Pure — unit-tested in isolation.
 */
export function stepPositions(current: number[], targets: number[]): number[] | null {
  let changed = false
  const next = current.map((p, i) => {
    const target = targets[i] ?? 0
    if (p < target) { changed = true; return p + 1 }
    if (p > target) { changed = true; return target }
    return p
  })
  return changed ? next : null
}

/** Whether a board position is a ☸ space (used by game logic callers). */
export function isChakraSpace(position: number): boolean {
  return spaceAt(position).type === 'chakra'
}

interface Props {
  teams: Team[]
  positions: number[]
  activeTeamIndex: number
  /** True while a turn is being played (currentTurn !== null). */
  turnActive?: boolean
}

export function BoardTrack({ teams, positions, activeTeamIndex, turnActive = false }: Props) {
  const { width: screenW } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)

  // displayPositions trail the real ones, stepping once per STEP_MS.
  const [displayPositions, setDisplayPositions] = useState(positions)
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayPositions(current => stepPositions(current, positions) ?? current)
    }, STEP_MS)
    return () => clearInterval(interval)
  }, [positions])

  // The enlargement follows whoever is currently WALKING. Between turns it
  // STAYS on the last walker's landing tile; it only moves to the active
  // team's tile once Start Turn is pressed (turnActive).
  const walkingIdx = displayPositions.findIndex((p, i) => p !== (positions[i] ?? 0))
  const lastWalkerRef = useRef<number | null>(null)
  if (walkingIdx >= 0) lastWalkerRef.current = walkingIdx
  const focusIdx =
    walkingIdx >= 0
      ? walkingIdx
      : turnActive
        ? activeTeamIndex
        : (lastWalkerRef.current ?? activeTeamIndex)
  const focusPos = displayPositions[focusIdx] ?? 0

  // Keep the focused segment centred as it walks. Fires only when the walked
  // position changes, so manual dragging is never fought.
  useEffect(() => {
    const x = focusPos * (STRIPE_W + SEG_GAP) - screenW / 2 + STRIPE_BIG_W / 2
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
        {BOARD_SPACES.map((space, index) => (
          <Segment
            key={index}
            space={space}
            focused={index === focusPos}
            teamsHere={displayPositions
              .map((p, i) => (p === index ? i : -1))
              .filter(i => i >= 0)}
            teams={teams}
            focusTeamIdx={focusIdx}
          />
        ))}
      </View>
    </ScrollView>
  )
}

// ── One board segment ───────────────────────────────────────────────────────
// Sizes are driven by an Animated value so grow/shrink is smooth on native
// AND web. The segment growing wider pushes its neighbours outward naturally.

function Segment({
  space,
  focused,
  teamsHere,
  teams,
  focusTeamIdx,
}: {
  space: BoardSpace
  focused: boolean
  teamsHere: number[]
  teams: Team[]
  focusTeamIdx: number
}) {
  const grow = useRef(new Animated.Value(focused ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(grow, {
      toValue: focused ? 1 : 0,
      duration: GROW_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width/height are layout props
    }).start()
  }, [focused, grow])

  const bg =
    space.type === 'category'
      ? CATEGORY_COLOURS[space.category]
      : space.type === 'finish'
        ? FINISH_GOLD
        : '#FFFFFF'

  return (
    <Animated.View
      style={[
        styles.segment,
        {
          backgroundColor: bg,
          width: grow.interpolate({ inputRange: [0, 1], outputRange: [STRIPE_W, STRIPE_BIG_W] }),
          height: grow.interpolate({ inputRange: [0, 1], outputRange: [STRIPE_H, STRIPE_BIG_H] }),
          borderRadius: grow.interpolate({ inputRange: [0, 1], outputRange: [6, 8] }),
          borderWidth: grow.interpolate({ inputRange: [0, 1], outputRange: [2, 2.5] }),
        },
      ]}
    >
      {/* All labels run downward so small → large is seamless */}
      {space.type === 'category' && (
        <VerticalLabel
          text={focused ? space.category : CATEGORY_LETTERS[space.category]}
          boxHeight={(focused ? STRIPE_BIG_H : STRIPE_H) - 26}
        />
      )}
      {space.type === 'chakra' && <Chakra size={focused ? 36 : 26} bgColor="#FFFFFF" />}
      {space.type === 'finish' && (
        <VerticalLabel
          text={focused ? 'FINISH' : '🏁'}
          boxHeight={(focused ? STRIPE_BIG_H : STRIPE_H) - 26}
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
                i === focusTeamIdx && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </Animated.View>
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

const styles = StyleSheet.create({
  strip: {
    flexGrow: 0,
    // Reserve the ENLARGED tile's height permanently: growing/shrinking
    // tiles happen inside this fixed box, so the UI below never bounces.
    height: STRIPE_BIG_H + 8,
  },
  content: {
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  band: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SEG_GAP,
  },
  segment: {
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 5,
    overflow: 'hidden',
  },
  dotRow: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },
  dotActive: {
    width: 15,
    height: 15,
    borderRadius: 8,
  },
})

const vertStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    transform: [{ rotate: '90deg' }],
  },
})

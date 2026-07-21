import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native'
import type { Card, Category, TurnPhase } from '@/types/game'
import { GameCard } from './GameCard'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { SPACING } from '@/constants/theme'
import type { CardLanguage } from '@/utils/prefs'

// How long Void must be held before it fires — long enough to stop mis-taps,
// short enough not to feel broken.
const VOID_HOLD_MS = 550

// LayoutAnimation needs an explicit opt-in on the old Android architecture
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

/** Animate the next stack reflow (card removed, added, or reordered). */
function animateReflow() {
  LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
}

interface Props {
  cards: Card[]
  phase: TurnPhase
  selectedCategory: Category | null
  correctIds: string[]
  voidedIds: string[]
  skipsRemaining: number
  /** True when reveal is blocked because no category has been chosen yet. */
  needsCategory?: boolean
  /**
   * Chakra bonus turn: each card plays its own ☸ word, so the highlighted
   * category comes from the card itself instead of `selectedCategory`.
   */
  chakraWords?: boolean
  primaryLanguage?: CardLanguage
  onReveal: () => void
  onCorrect: (cardId: string) => void
  onVoid: (cardId: string) => void
  onSkip: () => void
}

export function CardStack({
  cards,
  phase,
  selectedCategory,
  correctIds,
  voidedIds,
  skipsRemaining,
  needsCategory = false,
  chakraWords = false,
  primaryLanguage = 'en',
  onReveal,
  onCorrect,
  onVoid,
  onSkip,
}: Props) {
  // Section 6.5: when the timer expires ('ended'), cards blur again —
  // content is hidden until the player confirms the end of the round.
  const isRevealed = phase === 'active'
  const isTimeUp = phase === 'ended'
  const canSkip = phase === 'active' && skipsRemaining > 0

  // One short "pencils down" wobble of the whole stack when time runs out
  const wobble = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!isTimeUp) return
    wobble.setValue(0)
    Animated.timing(wobble, {
      toValue: 1,
      duration: 340,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start()
  }, [isTimeUp, wobble])
  const wobbleDeg = wobble.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '-1.3deg', '1deg', '-0.5deg', '0deg'],
  })

  // Only ONE card carries the "TIME'S UP" message: the top playable card
  // (voided cards keep just their stamp). Falls back to the very top card
  // if everything is voided.
  const firstPlayable = cards.findIndex(c => !voidedIds.includes(c.id))
  const messageIndex = firstPlayable === -1 ? 0 : firstPlayable

  // Entrance direction per card: a card that GREW the stack (skip, void
  // replacement, un-correct) drops in from the TOP and pushes the rest down;
  // a replacement or the opening card deals in from the side.
  const prevIdsRef = useRef<string[]>([])
  const prevIds = prevIdsRef.current
  const stackGrew = cards.length > prevIds.length && prevIds.length > 0
  useEffect(() => {
    prevIdsRef.current = cards.map(c => c.id)
  })

  return (
    <Animated.View style={[styles.container, { transform: [{ rotate: wobbleDeg }] }]}>
      {cards.map((card, index) => {
        const isTopCard = index === 0
        const isVoided = voidedIds.includes(card.id)
        const isAlreadyCorrect = correctIds.includes(card.id)
        const isNewCard = !prevIds.includes(card.id)

        return (
          <StackCard
            key={card.id}
            entrance={isNewCard && stackGrew ? 'top' : 'side'}
            onCorrect={() => {
              animateReflow()
              onCorrect(card.id)
            }}
          >
            {({ flyOff }) => (
              <View style={styles.cardWrapper}>
                <GameCard
                  card={card}
                  isRevealed={isRevealed}
                  isVoided={isVoided}
                  selectedCategory={chakraWords ? card.chakraCategory : selectedCategory}
                  onTapToReveal={isTopCard && phase === 'waiting' ? onReveal : undefined}
                  isTimeUp={isTimeUp}
                  showTimeUpText={index === messageIndex && !isVoided}
                  needsCategory={isTopCard && needsCategory}
                  primaryLanguage={primaryLanguage}
                />

                {/* Action buttons: Skip · Correct · Void (hold), in fixed order.
                    Voided cards have no actions — the stamp says it all. */}
                {(isRevealed || isTimeUp) && !isAlreadyCorrect && !isVoided && (
                  <View style={styles.cardActions}>
                    {isTopCard && canSkip && (
                      <ActionButton
                        label={
                          Number.isFinite(skipsRemaining)
                            ? `Skip (${skipsRemaining} left)`
                            : 'Skip'
                        }
                        colour={CATEGORY_COLOURS.Movie}
                        textColour="#FFFFFF"
                        onPress={() => {
                          animateReflow()
                          onSkip()
                        }}
                      />
                    )}
                    <ActionButton
                      label="Correct ✓"
                      colour={CATEGORY_COLOURS.Nature}
                      textColour="#FFFFFF"
                      onPress={flyOff}
                    />
                    <HoldToVoidButton
                      onVoid={() => {
                        animateReflow()
                        onVoid(card.id)
                      }}
                    />
                  </View>
                )}
              </View>
            )}
          </StackCard>
        )
      })}
    </Animated.View>
  )
}

// ── StackCard ───────────────────────────────────────────────────────────────
// Owns the card's life-cycle motion.
//   Entrance 'side' — deals in from the right, settling flat (opening card
//                     and post-correct replacements, like Just Cards' enter).
//   Entrance 'top'  — drops in from above, pushing the stack down (skips,
//                     void replacements).
//   Correct exit    — slides off to the LEFT with a slight tilt, identical
//                     to Just Cards' next-arrow motion; the dispatch fires
//                     once the card has visually left.

function StackCard({
  entrance,
  onCorrect,
  children,
}: {
  entrance: 'side' | 'top'
  onCorrect: () => void
  children: (api: { flyOff: () => void }) => React.ReactNode
}) {
  const { width: screenW } = useWindowDimensions()
  const anim = useRef(new Animated.Value(0)).current // 0 = entering, 1 = settled
  const exit = useRef(new Animated.Value(0)).current // 0 = in place, 1 = gone
  const [leaving, setLeaving] = useState(false)
  const firedRef = useRef(false)
  // Lock the entrance direction at mount — re-renders must not change it
  const entranceRef = useRef(entrance)

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: entranceRef.current === 'top' ? 240 : 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [anim])

  const flyOff = () => {
    if (firedRef.current) return
    firedRef.current = true
    setLeaving(true)
    Animated.timing(exit, {
      toValue: 1,
      duration: 170,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => onCorrect())
  }

  const fromTop = entranceRef.current === 'top'

  return (
    <Animated.View
      pointerEvents={leaving ? 'none' : 'auto'}
      style={{
        opacity: anim,
        transform: [
          {
            // Enter: from the right (side) or not at all (top).
            // Exit: off to the LEFT across the full screen — Just Cards' deal.
            translateX: Animated.add(
              anim.interpolate({
                inputRange: [0, 1],
                outputRange: [fromTop ? 0 : screenW * 0.6, 0],
              }),
              exit.interpolate({ inputRange: [0, 1], outputRange: [0, -screenW] }),
            ),
          },
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [fromTop ? -72 : 0, 0],
            }),
          },
          {
            // Settle-in tilt on side entrances; Just Cards' -2.5° tilt on exit
            rotate: Animated.add(
              anim.interpolate({ inputRange: [0, 1], outputRange: [fromTop ? 0 : 0.028, 0] }),
              exit.interpolate({ inputRange: [0, 1], outputRange: [0, -0.044] }),
            ).interpolate({ inputRange: [-1, 1], outputRange: ['-57.3deg', '57.3deg'] }),
          },
        ],
      }}
    >
      {children({ flyOff })}
    </Animated.View>
  )
}

function ActionButton({
  label,
  colour,
  textColour,
  onPress,
  disabled = false,
}: {
  label: string
  colour: string
  textColour: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        actionStyles.btn,
        { backgroundColor: colour },
        disabled && actionStyles.disabled,
        pressed && !disabled && actionStyles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[actionStyles.label, { color: textColour }]}>{label}</Text>
    </Pressable>
  )
}

// ── Hold-to-void ────────────────────────────────────────────────────────────
// Void is irreversible within a turn, so it can't be a plain tap: hold the
// button and a grey fill sweeps across; releasing early cancels.

function HoldToVoidButton({ onVoid }: { onVoid: () => void }) {
  const fill = useRef(new Animated.Value(0)).current
  const firedRef = useRef(false)

  const startHold = () => {
    firedRef.current = false
    Animated.timing(fill, {
      toValue: 1,
      duration: VOID_HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false, // animating width
    }).start(({ finished }) => {
      if (finished && !firedRef.current) {
        firedRef.current = true
        onVoid()
      }
    })
  }

  const cancelHold = () => {
    fill.stopAnimation()
    Animated.timing(fill, {
      toValue: 0,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()
  }

  const fillWidth = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <Pressable
      style={actionStyles.voidBtn}
      onPressIn={startHold}
      onPressOut={cancelHold}
    >
      <Animated.View style={[actionStyles.voidFill, { width: fillWidth }]} />
      <Text style={actionStyles.voidLabel}>Hold to Void</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  cardWrapper: {
    gap: SPACING.sm,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
})

const actionStyles = StyleSheet.create({
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#000000',
    alignItems: 'center',
  },
  pressed: {
    transform: [{ scale: 0.96 }, { translateY: 1 }],
  },
  label: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  disabled: {
    opacity: 0.4,
  },

  voidBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: CATEGORY_COLOURS.Random,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    overflow: 'hidden',
  },
  voidFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  voidLabel: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: CATEGORY_COLOURS.Random,
  },
})

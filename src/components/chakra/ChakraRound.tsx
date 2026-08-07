// =============================================================================
// components/chakra/ChakraRound.tsx
// Full-screen UI for a Chakra round (Section 7), in the Indi-Q card theme:
// green (Nature) card-row bands on the cream table, with each team's answer
// button in that team's identity colour.
//
// Flow (mirrors ChakraPhase):
//   'selecting' — describer sees config.chakraCardCount cards and picks one.
//   'active'    — the chosen card is shown; the describer explains its Chakra
//                 word while EVERY team guesses, then taps the team that
//                 guessed first.
//   'ended'     — winner + reward announcement; confirm to resume play.
// =============================================================================

import { useEffect, useRef } from 'react'
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import type { Card, ChakraReward, ChakraState, Team } from '@/types/game'
import { GameCard } from '@/components/card/GameCard'
import { Chakra } from '@/components/card/Chakra'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { BRAND_COLOURS } from '@/constants/brandAssets'
import { teamColourAt } from '@/constants/teams'

const GREEN = CATEGORY_COLOURS.Nature
const INK = BRAND_COLOURS.ink
const HINT = BRAND_COLOURS.hint

interface Props {
  chakraState: ChakraState
  teams: Team[]
  reward: ChakraReward
  primaryLanguage?: 'en' | 'ml'
  /** False when the round is mandatory (board ☸ landings) — hides Cancel. */
  allowCancel?: boolean
  onSelectCard: (card: Card) => void
  onTeamWon: (teamId: string) => void
  /** Back out during card selection — accidental trigger, costs nothing. */
  onCancel: () => void
  onEndWithoutWinner: () => void
  onConfirmEnd: () => void
}

export function ChakraRound({
  chakraState,
  teams,
  reward,
  primaryLanguage = 'en',
  allowCancel = true,
  onSelectCard,
  onTeamWon,
  onCancel,
  onEndWithoutWinner,
  onConfirmEnd,
}: Props) {
  const { phase, cards, selectedCard, winningTeamId } = chakraState
  const winnerIdx = teams.findIndex(t => t.id === winningTeamId)
  const winner = winnerIdx >= 0 ? teams[winnerIdx] : undefined

  return (
    <View style={styles.container}>
      {/* Header band — green card row with the chakra mark */}
      <View style={styles.headerBand}>
        <Chakra bgColor={GREEN} size={26} />
        <Text style={styles.headerText}>Chakra Round</Text>
      </View>

      {/* ── Phase: selecting ── */}
      {phase === 'selecting' && (
        <>
          <Text style={styles.subtitle}>
            Pick a card. You will describe its Chakra word while every team guesses!
          </Text>
          <ScrollView
            contentContainerStyle={styles.cardList}
            showsVerticalScrollIndicator={false}
          >
            {cards.map((card, idx) => (
              <CascadeIn key={card.id} index={idx}>
                <TouchableOpacity onPress={() => onSelectCard(card)} activeOpacity={0.8}>
                  <GameCard
                    card={card}
                    isRevealed
                    isVoided={false}
                    selectedCategory={card.chakraCategory}
                    primaryLanguage={primaryLanguage}
                  />
                </TouchableOpacity>
              </CascadeIn>
            ))}

            {/* Escape hatch: accidental trigger costs nothing.
                Hidden when the round is mandatory (board ☸ landing). */}
            {allowCancel && (
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              >
                <Text style={styles.cancelBtnText}>← Cancel, back to normal turn</Text>
              </Pressable>
            )}
          </ScrollView>
        </>
      )}

      {/* ── Phase: active ── */}
      {phase === 'active' && selectedCard && (
        <>
          <Text style={styles.subtitle}>
            Describe the Chakra word. First team to guess it wins!
          </Text>
          <GameCard
            card={selectedCard}
            isRevealed
            isVoided={false}
            selectedCategory={selectedCard.chakraCategory}
            primaryLanguage={primaryLanguage}
          />

          <Text style={styles.whoGuessed}>Which team guessed it first?</Text>
          <View style={styles.teamButtons}>
            {teams.map((team, idx) => (
              <Pressable
                key={team.id}
                style={({ pressed }) => [
                  styles.teamBtn,
                  { backgroundColor: teamColourAt(idx) },
                  pressed && styles.pressed,
                ]}
                onPress={() => onTeamWon(team.id)}
              >
                <Text style={styles.teamBtnText} numberOfLines={1}>
                  {team.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onEndWithoutWinner}
            style={({ pressed }) => [styles.noWinnerBtn, pressed && styles.pressed]}
          >
            <Text style={styles.noWinnerText}>Nobody guessed it, end the round</Text>
          </Pressable>
        </>
      )}

      {/* ── Phase: ended ── */}
      {phase === 'ended' && winner && (
        <WinnerSpring style={styles.resultBlock}>
          <Text style={styles.resultLabel}>Chakra round won by</Text>
          <View style={[styles.winnerBand, { backgroundColor: teamColourAt(winnerIdx) }]}>
            <Text
              style={styles.winnerBandText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {winner.name}
            </Text>
          </View>
          <Text style={styles.resultReward}>
            {reward === 'extra-round'
              ? `${winner.name} plays a bonus round next!`
              : `+${reward} point${reward === 1 ? '' : 's'}`}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
            onPress={onConfirmEnd}
          >
            <Text style={styles.confirmBtnText}>Continue →</Text>
          </Pressable>
        </WinnerSpring>
      )}
    </View>
  )
}

// ── Entrance animations ─────────────────────────────────────────────────────

// Cards deal in one after another (80ms stagger)
function CascadeIn({ index, children }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      delay: index * 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [anim, index])

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  )
}

// Winner announcement springs in (same feel as the results screen)
function WinnerSpring({
  style,
  children,
}: {
  style?: object
  children: React.ReactNode
}) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start()
  }, [anim])

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 14,
    paddingBottom: 12,
  },
  headerBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GREEN,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  headerText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  subtitle: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 14,
    color: HINT,
    lineHeight: 21,
  },
  cardList: {
    gap: 14,
    paddingBottom: 24,
  },
  whoGuessed: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 18,
    color: INK,
    marginTop: 4,
    lineHeight: 25,
  },
  teamButtons: {
    gap: 10,
  },
  teamBtn: {
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 13,
    alignItems: 'center',
  },
  teamBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: '#000000',
  },
  cancelBtn: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 2,
  },
  cancelBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 14,
    color: INK,
  },
  noWinnerBtn: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: CATEGORY_COLOURS.Random,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    alignItems: 'center',
  },
  noWinnerText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: CATEGORY_COLOURS.Random,
  },
  pressed: {
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },

  resultBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 48,
  },
  resultLabel: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 14,
    color: HINT,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  winnerBand: {
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  winnerBandText: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 36,
    color: '#000000',
    // Deliberately no explicit line height — see teamBandText in game.tsx.
  },
  resultReward: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 17,
    color: GREEN,
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: BRAND_COLOURS.orange,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#7a4a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  confirmBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 19,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})

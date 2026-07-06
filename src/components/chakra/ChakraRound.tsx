// =============================================================================
// components/chakra/ChakraRound.tsx
// Full-screen UI for a Chakra round (Section 7).
//
// Flow (mirrors ChakraPhase):
//   'selecting' — describer sees config.chakraCardCount cards and picks one.
//   'active'    — the chosen card is shown; the describer explains its Chakra
//                 word while EVERY team guesses. The describer then taps the
//                 team that guessed first.
//   'ended'     — winner + reward announcement; confirm to resume play.
// =============================================================================

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { Card, ChakraReward, ChakraState, Team } from '@/types/game'
import { GameCard } from '@/components/card/GameCard'
import { Chakra } from '@/components/card/Chakra'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

interface Props {
  chakraState: ChakraState
  teams: Team[]
  reward: ChakraReward
  onSelectCard: (card: Card) => void
  onTeamWon: (teamId: string) => void
  onEndWithoutWinner: () => void
  onConfirmEnd: () => void
}

export function ChakraRound({
  chakraState,
  teams,
  reward,
  onSelectCard,
  onTeamWon,
  onEndWithoutWinner,
  onConfirmEnd,
}: Props) {
  const { phase, cards, selectedCard, winningTeamId } = chakraState
  const winner = teams.find(t => t.id === winningTeamId)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.chakraBadge}>
          <Chakra bgColor={COLOURS.background} size={28} />
        </View>
        <Text style={styles.title}>Chakra Round</Text>
      </View>

      {/* ── Phase: selecting ── */}
      {phase === 'selecting' && (
        <>
          <Text style={styles.subtitle}>
            Pick a card — you will describe its Chakra word while every team guesses!
          </Text>
          <ScrollView
            contentContainerStyle={styles.cardList}
            showsVerticalScrollIndicator={false}
          >
            {cards.map(card => (
              <TouchableOpacity
                key={card.id}
                onPress={() => onSelectCard(card)}
                activeOpacity={0.8}
              >
                <GameCard
                  card={card}
                  isRevealed
                  isVoided={false}
                  selectedCategory={card.chakraCategory}
                />
              </TouchableOpacity>
            ))}
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
          />

          <Text style={styles.whoGuessed}>Which team guessed it first?</Text>
          <View style={styles.teamButtons}>
            {teams.map(team => (
              <TouchableOpacity
                key={team.id}
                style={styles.teamBtn}
                onPress={() => onTeamWon(team.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.teamBtnText}>{team.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={onEndWithoutWinner} hitSlop={8}>
            <Text style={styles.noWinner}>Nobody guessed it — end the round</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Phase: ended ── */}
      {phase === 'ended' && winner && (
        <View style={styles.resultBlock}>
          <Text style={styles.resultLabel}>Chakra round won by</Text>
          <Text style={styles.resultTeam}>{winner.name}</Text>
          <Text style={styles.resultReward}>
            {reward === 'extra-round'
              ? `${winner.name} plays a bonus round next!`
              : `+${reward} point${reward === 1 ? '' : 's'}`}
          </Text>

          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirmEnd} activeOpacity={0.85}>
            <Text style={styles.confirmBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  chakraBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textSecondary,
    lineHeight: 22,
  },
  cardList: {
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  whoGuessed: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLOURS.textPrimary,
    marginTop: SPACING.sm,
  },
  teamButtons: {
    gap: SPACING.sm,
  },
  teamBtn: {
    backgroundColor: COLOURS.textPrimary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  teamBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLOURS.background,
  },
  noWinner: {
    fontSize: FONT_SIZE.sm,
    color: COLOURS.danger,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  resultBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  resultLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLOURS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  resultTeam: {
    fontSize: 44,
    fontWeight: '900',
    color: COLOURS.textPrimary,
    textAlign: 'center',
  },
  resultReward: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLOURS.correct,
    marginTop: SPACING.xs,
  },
  confirmBtn: {
    backgroundColor: COLOURS.textPrimary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.xl,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLOURS.background,
  },
})

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { Card, Category, TurnPhase } from '@/types/game'
import { GameCard } from './GameCard'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

interface Props {
  cards: Card[]
  phase: TurnPhase
  selectedCategory: Category | null
  correctIds: string[]
  voidedIds: string[]
  skipsRemaining: number
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
  onReveal,
  onCorrect,
  onVoid,
  onSkip,
}: Props) {
  const isRevealed = phase === 'active' || phase === 'ended'
  const canSkip = phase === 'active' && skipsRemaining > 0

  return (
    <View style={styles.container}>
      {cards.map((card, index) => {
        const isTopCard = index === 0
        const isVoided = voidedIds.includes(card.id)
        const isAlreadyCorrect = correctIds.includes(card.id)

        return (
          <View key={card.id} style={styles.cardWrapper}>
            <GameCard
              card={card}
              isRevealed={isRevealed}
              isVoided={isVoided}
              selectedCategory={selectedCategory}
              onTapToReveal={isTopCard && !isRevealed ? onReveal : undefined}
            />

            {/* Per-card action buttons — only shown when card is revealed */}
            {isRevealed && !isAlreadyCorrect && (
              <View style={styles.cardActions}>
                {isTopCard && canSkip && (
                  <ActionButton
                    label={`Skip (${skipsRemaining} left)`}
                    colour={COLOURS.skip}
                    textColour="#fff"
                    onPress={onSkip}
                  />
                )}
                {!isVoided && (
                  <ActionButton
                    label="Void"
                    colour={COLOURS.surface}
                    textColour={COLOURS.danger}
                    onPress={() => onVoid(card.id)}
                  />
                )}
                <ActionButton
                  label="Correct ✓"
                  colour={COLOURS.correct}
                  textColour="#fff"
                  onPress={() => onCorrect(card.id)}
                  disabled={isVoided}
                />
              </View>
            )}

            {/* Spacer between stacked cards */}
            {index < cards.length - 1 && <View style={styles.stackSpacer} />}
          </View>
        )
      })}
    </View>
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
    <TouchableOpacity
      style={[actionStyles.btn, { backgroundColor: colour }, disabled && actionStyles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[actionStyles.label, { color: textColour }]}>{label}</Text>
    </TouchableOpacity>
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
  stackSpacer: {
    height: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    marginHorizontal: SPACING.xl,
  },
})

const actionStyles = StyleSheet.create({
  btn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
})

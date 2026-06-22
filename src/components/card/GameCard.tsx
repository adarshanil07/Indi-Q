import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { Card, Category } from '@/types/game'
import { CATEGORIES, CATEGORY_COLOURS } from '@/constants/categories'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

interface Props {
  card: Card
  isRevealed: boolean
  isVoided: boolean
  selectedCategory: Category | null
  /** Only defined on the top card when the card is blurred and waiting to be revealed. */
  onTapToReveal?: () => void
}

export function GameCard({ card, isRevealed, isVoided, selectedCategory, onTapToReveal }: Props) {
  const showOverlay = !isRevealed

  return (
    <TouchableOpacity
      style={[styles.card, isVoided && styles.cardVoided]}
      onPress={showOverlay ? onTapToReveal : undefined}
      activeOpacity={showOverlay ? 0.9 : 1}
      disabled={isRevealed}
    >
      {CATEGORIES.map(cat => (
        <CategoryRow
          key={cat}
          category={cat}
          word={card.words[cat]}
          isSelected={cat === selectedCategory}
          isRevealed={isRevealed}
          isChakra={card.chakraCategory === cat}
          dimmed={selectedCategory !== null && cat !== selectedCategory}
        />
      ))}

      {/* Blur overlay — hidden once the card is revealed */}
      {showOverlay && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Tap to Reveal</Text>
          <Text style={styles.overlaySubtext}>Pass the phone to the describer first</Text>
        </View>
      )}

      {/* Void overlay */}
      {isVoided && (
        <View style={styles.voidOverlay} pointerEvents="none">
          <Text style={styles.voidText}>VOID</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

function CategoryRow({
  category,
  word,
  isSelected,
  isRevealed,
  isChakra,
  dimmed,
}: {
  category: Category
  word: string
  isSelected: boolean
  isRevealed: boolean
  isChakra: boolean
  dimmed: boolean
}) {
  const colour = CATEGORY_COLOURS[category]
  return (
    <View
      style={[
        rowStyles.row,
        isSelected && rowStyles.rowSelected,
        dimmed && rowStyles.rowDimmed,
      ]}
    >
      <View style={[rowStyles.badge, { backgroundColor: colour }]}>
        <Text style={rowStyles.badgeText}>{category[0]}</Text>
      </View>
      <Text style={[rowStyles.categoryLabel, dimmed && rowStyles.labelDimmed]}>
        {category}
      </Text>
      <Text
        style={[
          rowStyles.word,
          !isRevealed && rowStyles.wordHidden,
          isSelected && rowStyles.wordSelected,
          dimmed && rowStyles.labelDimmed,
        ]}
        numberOfLines={1}
      >
        {isRevealed ? word : '• • •'}
      </Text>
      {isChakra && isRevealed && (
        <View style={rowStyles.chakraBadge}>
          <Text style={rowStyles.chakraText}>✦</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLOURS.background,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardVoided: {
    opacity: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLOURS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  overlayText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLOURS.background,
  },
  overlaySubtext: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  voidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  voidText: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '900',
    color: COLOURS.danger,
    letterSpacing: 4,
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  rowSelected: {
    backgroundColor: '#F8F8F8',
  },
  rowDimmed: {
    opacity: 0.4,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  categoryLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLOURS.textSecondary,
    width: 70,
  },
  labelDimmed: {
    color: COLOURS.textSecondary,
  },
  word: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLOURS.textPrimary,
    textAlign: 'right',
  },
  wordHidden: {
    color: COLOURS.textSecondary,
    fontWeight: '400',
  },
  wordSelected: {
    fontSize: FONT_SIZE.lg,
  },
  chakraBadge: {
    marginLeft: SPACING.xs,
  },
  chakraText: {
    fontSize: 14,
    color: '#F5A623',
  },
})

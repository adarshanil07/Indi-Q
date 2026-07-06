import { Fragment, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type DimensionValue } from 'react-native'
import { SvgXml } from 'react-native-svg'
import type { Card, Category } from '@/types/game'
import { CATEGORIES, CATEGORY_COLOURS } from '@/constants/categories'
import { CARD_SVG } from '@/constants/cardSvg'
import { Chakra } from './Chakra'

// Row bounds derived from the inner colored fill paths in the vectorized SVG
// (viewBox 703×502). top/height are percentages of the card's rendered height;
// TEXT_LEFT/TEXT_RIGHT are percentages of width for the word band.
// INDICATOR_LEFT/INDICATOR_RIGHT are for the right square column.
const ROW_BOUNDS: Record<Category, { top: DimensionValue; height: DimensionValue }> = {
  People:   { top: '5.68%',  height: '11.01%' },
  Location: { top: '21.24%', height: '11.03%' },
  Object:   { top: '36.94%', height: '11.02%' },
  Movie:    { top: '52.53%', height: '10.99%' },
  Nature:   { top: '68.07%', height: '11.00%' },
  Random:   { top: '83.75%', height: '10.99%' },
}
const TEXT_LEFT       = '6.12%'   // 43 / 703
const TEXT_RIGHT      = '18.21%'  // (703 - 575) / 703
const INDICATOR_LEFT  = '86.06%'  // 605 / 703
const INDICATOR_RIGHT = '6.12%'   // (703 - 660) / 703

interface Props {
  card: Card
  isRevealed: boolean
  isVoided: boolean
  selectedCategory: Category | null
  onTapToReveal?: () => void
  /**
   * When true, the hidden-card overlay reads "TIME'S UP" instead of
   * "TAP TO REVEAL" (Section 6.5 — cards re-blur when the timer expires).
   */
  isTimeUp?: boolean
  /**
   * When true, the hidden-card overlay explains that the card cannot be
   * revealed until a category has been selected.
   */
  needsCategory?: boolean
}

// Text sizes are proportional to the rendered card width so lettering keeps
// the same size relative to the card at any scale — exactly like print.
// Ratios derived from the physical card: word ≈ 5.8% of card width.
const WORD_SIZE_RATIO = 0.058
const WORD_ML_SIZE_RATIO = 0.034
const OVERLAY_LABEL_RATIO = 0.052
// Corner rounding as a fraction of card width, so the card silhouette is
// identical in Just Cards, the game screen, and anywhere else it renders.
const CORNER_RADIUS_RATIO = 0.028

export function GameCard({
  card,
  isRevealed,
  isVoided,
  selectedCategory,
  onTapToReveal,
  isTimeUp = false,
  needsCategory = false,
}: Props) {
  const [cardWidth, setCardWidth] = useState(0)

  const wordSize = cardWidth > 0 ? cardWidth * WORD_SIZE_RATIO : 22
  const wordMlSize = cardWidth > 0 ? cardWidth * WORD_ML_SIZE_RATIO : 13
  const overlayLabelSize = cardWidth > 0 ? cardWidth * OVERLAY_LABEL_RATIO : 20
  const cornerRadius = cardWidth > 0 ? cardWidth * CORNER_RADIUS_RATIO : 10

  return (
    <TouchableOpacity
      style={[styles.card, { borderRadius: cornerRadius }]}
      onLayout={e => setCardWidth(e.nativeEvent.layout.width)}
      onPress={!isRevealed ? onTapToReveal : undefined}
      activeOpacity={isRevealed ? 1 : 0.95}
      disabled={isRevealed}
    >
      {/* Vectorized card — provides all visual structure */}
      <SvgXml xml={CARD_SVG} width="100%" height="100%" style={styles.svgBackground} />

      {CATEGORIES.map(cat => {
        const bounds = ROW_BOUNDS[cat]
        const isDimmed = isRevealed && selectedCategory !== null && cat !== selectedCategory
        const isChakra = card.chakraCategory === cat

        // Overlays must be direct children of the card so percentage `top`
        // values resolve against the card's height, not a zero-height wrapper.
        return (
          <Fragment key={cat}>
            {/* Word text overlay on the left coloured band */}
            <View
              style={[
                styles.wordArea,
                { top: bounds.top, height: bounds.height },
                isDimmed && styles.dimmed,
              ]}
            >
              {isRevealed && (
                <View style={styles.wordRow}>
                  {/* English word never shrinks in favour of the Malayalam —
                      it only scales down once it alone exceeds the band. */}
                  <Text
                    style={[styles.word, { fontSize: wordSize }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.3}
                  >
                    {card.words[cat]}
                  </Text>
                  {card.wordsMl?.[cat] != null && (
                    <Text style={[styles.wordMl, { fontSize: wordMlSize }]} numberOfLines={1}>
                      {card.wordsMl[cat]}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Chakra overlay on the right indicator square */}
            {isChakra && (
              <View
                style={[
                  styles.indicatorArea,
                  { top: bounds.top, height: bounds.height },
                  isDimmed && styles.dimmed,
                ]}
              >
                <Chakra bgColor={CATEGORY_COLOURS[cat]} size="82%" />
              </View>
            )}
          </Fragment>
        )
      })}

      {/* Unrevealed / time's-up overlay */}
      {!isRevealed && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={[styles.overlayLabel, { fontSize: overlayLabelSize }]}>
            {isTimeUp ? "TIME'S UP" : needsCategory ? 'SELECT A CATEGORY' : 'TAP TO REVEAL'}
          </Text>
          <Text style={styles.overlaySub}>
            {isTimeUp
              ? 'Confirm the end of the round below'
              : needsCategory
                ? 'Tap to reveal is locked until a category is chosen below'
                : 'Pass the phone to the describer first'}
          </Text>
        </View>
      )}

      {/* Voided overlay */}
      {isVoided && (
        <View style={styles.voidOverlay} pointerEvents="none">
          <Text style={styles.voidLabel}>VOID</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 703 / 502,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    // Solid grey edge + soft shadow so the card reads as a physical object
    // against the white screen background.
    borderWidth: 1.5,
    borderColor: '#D6D6D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 7,
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  wordArea: {
    position: 'absolute',
    left: TEXT_LEFT,
    right: TEXT_RIGHT,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 6,
  },
  // Word sits on the left; Malayalam takes whatever width remains and is
  // the first to give way when space runs out (flexShrink 0 vs 1).
  wordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-start',
    gap: 10,
    width: '100%',
    paddingLeft: 8,
  },
  word: {
    fontFamily: 'Quicksand_700Bold',
    color: '#000000',
    textAlign: 'left',
    flexShrink: 0,
    maxWidth: '100%',
  },
  wordMl: {
    fontFamily: 'BalooChettan2_500Medium',
    color: 'rgba(0,0,0,0.45)',
    flexShrink: 1,
  },

  indicatorArea: {
    position: 'absolute',
    left: INDICATOR_LEFT,
    right: INDICATOR_RIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  dimmed: {
    opacity: 0.15,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  overlayLabel: {
    fontFamily: 'BalooChettan2_700Bold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  overlaySub: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  voidOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voidLabel: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 40,
    color: '#ED1C24',
    letterSpacing: 6,
  },
})

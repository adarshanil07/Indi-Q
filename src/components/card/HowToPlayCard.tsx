// =============================================================================
// components/card/HowToPlayCard.tsx
// Faithful recreation of the physical card's rules back, built entirely from
// the vectorized card assets: the hand-vectorized category squares
// (CATEGORY_BOX_SVGS) and the vectorized Chakra. Same silhouette, border and
// shadow as GameCard so the two read as front and back of the same deck.
//
// All text and box sizes are ratios of the rendered card width — exactly like
// GameCard — so the layout holds at any scale, like print.
// =============================================================================

import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import type { Category } from '@/types/game'
import { CATEGORY_BOX_SVGS } from '@/constants/cardSvg'
import { Chakra } from './Chakra'

// The printed card back uses its own labels ("Person", "Place"); each maps to
// the app category whose vectorized square it is printed with.
const GRID: { label: string; category: Category }[][] = [
  [
    { label: 'Person', category: 'People' },
    { label: 'Object', category: 'Object' },
    { label: 'Nature', category: 'Nature' },
  ],
  [
    { label: 'Place', category: 'Location' },
    { label: 'Movie', category: 'Movie' },
    { label: 'Random', category: 'Random' },
  ],
]

const INTRO_TEXT =
  'This game can be played on its own or with other suitable games. ' +
  'Aim of the game is for the team mates to guess the word without you ' +
  'saying the word on the card.'
const CHAKRA_TEXT = 'Where the Chakra is for the random selection'
const FOOTER_LINE = 'Made in the Mind of a Malayalee'
const FOOTER_BRAND = 'CHINDIKKU INDI-Q'

// Same corner rounding as GameCard so the silhouette matches.
const CORNER_RADIUS_RATIO = 0.028

export function HowToPlayCard() {
  const [cardWidth, setCardWidth] = useState(0)
  // Scale helper: everything on the card is a fraction of its rendered width.
  const s = (ratio: number) => cardWidth * ratio

  return (
    <View
      style={[styles.card, { borderRadius: s(CORNER_RADIUS_RATIO) || 10 }]}
      onLayout={e => setCardWidth(e.nativeEvent.layout.width)}
    >
      {cardWidth > 0 && (
        <View
          style={[
            styles.inner,
            { paddingHorizontal: s(0.055), paddingVertical: s(0.042) },
          ]}
        >
          <Text style={[styles.intro, { fontSize: s(0.036), lineHeight: s(0.056) }]}>
            {INTRO_TEXT}
          </Text>

          <View style={[styles.chakraRow, { gap: s(0.02) }]}>
            <Chakra size={s(0.075)} bgColor="#FFFFFF" />
            <Text style={[styles.chakraText, { fontSize: s(0.036) }]}>{CHAKRA_TEXT}</Text>
          </View>

          <View style={{ gap: s(0.035) }}>
            {GRID.map((row, i) => (
              <View key={i} style={styles.gridRow}>
                {row.map(cell => (
                  <View key={cell.label} style={[styles.gridCell, { gap: s(0.018) }]}>
                    <SvgXml
                      xml={CATEGORY_BOX_SVGS[cell.category]}
                      width={s(0.095)}
                      height={s(0.095)}
                    />
                    <Text style={[styles.gridLabel, { fontSize: s(0.046) }]}>
                      {cell.label}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerLine, { fontSize: s(0.044) }]}>{FOOTER_LINE}</Text>
            <Text style={[styles.footerBrand, { fontSize: s(0.046) }]}>{FOOTER_BRAND}</Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // Physical-object treatment identical to GameCard.
  card: {
    aspectRatio: 703 / 502,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D6D6D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 7,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  intro: {
    fontFamily: 'Quicksand_500Medium',
    color: '#000000',
    textAlign: 'center',
  },
  chakraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chakraText: {
    fontFamily: 'Quicksand_500Medium',
    color: '#000000',
    flexShrink: 1,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    fontFamily: 'Quicksand_700Bold',
    color: '#000000',
    flexShrink: 1,
  },
  footer: {
    alignItems: 'center',
  },
  footerLine: {
    fontFamily: 'Quicksand_700Bold',
    color: '#000000',
  },
  footerBrand: {
    fontFamily: 'Quicksand_700Bold',
    color: '#000000',
    letterSpacing: 1.5,
  },
})

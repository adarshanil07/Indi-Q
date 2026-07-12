// =============================================================================
// components/ui/CategoryBar.tsx
// Category selector rendered with the ACTUAL vectorized indicator squares from
// the card SVG — identical borders, colours, and hand-vectorized edges to the
// boxes printed on the physical card.
// =============================================================================

import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import type { Category } from '@/types/game'
import { CATEGORIES } from '@/constants/categories'
import { CATEGORY_BOX_SVGS } from '@/constants/cardSvg'
import { SPACING } from '@/constants/theme'

interface Props {
  selectedCategory: Category | null
  onSelect: (cat: Category) => void
  /** When false the bar still shows the selection but ignores taps. */
  interactive?: boolean
}

export function CategoryBar({ selectedCategory, onSelect, interactive = true }: Props) {
  return (
    <View style={styles.row}>
      {CATEGORIES.map(cat => {
        const isSelected = cat === selectedCategory
        const isDimmed = selectedCategory !== null && !isSelected
        return (
          <TouchableOpacity
            key={cat}
            testID={`category-box-${cat}`}
            style={[
              styles.box,
              isDimmed && styles.boxDimmed,
              isSelected && styles.boxSelected,
            ]}
            onPress={() => onSelect(cat)}
            disabled={!interactive}
            activeOpacity={0.7}
          >
            <SvgXml xml={CATEGORY_BOX_SVGS[cat]} width="100%" height="100%" />
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  box: {
    flex: 1,
    aspectRatio: 1,
  },
  boxDimmed: {
    opacity: 0.25,
  },
  boxSelected: {
    transform: [{ scale: 1.12 }],
  },
})

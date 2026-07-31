// =============================================================================
// components/ui/LanguageToggle.tsx
// EN | മ pill toggle controlling which language is the card's main text.
// Used in Just Cards and the Full Game; the choice persists via prefs.
// =============================================================================

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { BRAND_COLOURS } from '@/constants/brandAssets'
import type { CardLanguage } from '@/utils/prefs'

interface Props {
  language: CardLanguage
  onChange: (l: CardLanguage) => void
  /** Slightly smaller variant for tight rows. */
  compact?: boolean
}

export function LanguageToggle({ language, onChange, compact = false }: Props) {
  return (
    <View style={styles.toggle}>
      <TouchableOpacity
        style={[styles.seg, compact && styles.segCompact, language === 'en' && styles.segActive]}
        onPress={() => onChange('en')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.text,
            { fontFamily: 'Quicksand_700Bold' },
            language === 'en' && styles.textActive,
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.seg, compact && styles.segCompact, language === 'ml' && styles.segActive]}
        onPress={() => onChange('ml')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.text,
            { fontFamily: 'BalooChettan2_700Bold' },
            language === 'ml' && styles.textActive,
          ]}
        >
          മ
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 999,
    padding: 3,
  },
  seg: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  segCompact: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    minWidth: 42,
  },
  segActive: {
    backgroundColor: BRAND_COLOURS.ink,
  },
  text: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 14,
    color: BRAND_COLOURS.hint,
    lineHeight: 18,
  },
  textActive: {
    color: '#FFFFFF',
  },
})

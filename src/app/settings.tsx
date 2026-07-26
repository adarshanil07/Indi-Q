import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { showPrivacyOptions, usePrivacyOptionsRequired } from '@/ads'
import { COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

export default function SettingsScreen() {
  // Only EEA/UK users are offered this; elsewhere no consent was gathered, so
  // there is nothing to change and the row would be confusing.
  const privacyOptionsRequired = usePrivacyOptionsRequired()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {privacyOptionsRequired && (
        <TouchableOpacity
          style={styles.row}
          onPress={showPrivacyOptions}
          activeOpacity={0.7}
        >
          <Text style={styles.rowLabel}>Ad privacy choices</Text>
          <Text style={styles.rowHint}>
            Change or withdraw your consent for personalised ads
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Settings coming soon</Text>
        <Text style={styles.placeholderSub}>
          Theme, sound effects, and premium options will live here.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOURS.background, paddingHorizontal: SPACING.xl },
  header: { paddingTop: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  back: { fontSize: FONT_SIZE.md, color: COLOURS.textSecondary },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLOURS.textPrimary },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  rowLabel: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLOURS.textPrimary },
  rowHint: { fontSize: FONT_SIZE.sm, color: COLOURS.textSecondary },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  placeholderText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLOURS.textPrimary },
  placeholderSub: { fontSize: FONT_SIZE.md, color: COLOURS.textSecondary, textAlign: 'center' },
})

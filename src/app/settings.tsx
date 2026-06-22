import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
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
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  placeholderText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLOURS.textPrimary },
  placeholderSub: { fontSize: FONT_SIZE.md, color: COLOURS.textSecondary, textAlign: 'center' },
})

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.publisher}>EnJoy Games</Text>
        <Text style={styles.title}>Indi-Q</Text>
        <Text style={styles.tagline}>The Malayalam party card game</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => router.push('/just-cards')}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, styles.btnTextPrimary]}>Just Cards</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => router.push('/setup')}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>Full Game</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => router.push('/how-to-play')}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>How to Play</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => router.push('/settings')}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.background,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publisher: {
    fontSize: FONT_SIZE.sm,
    color: COLOURS.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 72,
    fontWeight: '900',
    color: COLOURS.textPrimary,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textSecondary,
    marginTop: SPACING.sm,
  },
  actions: {
    gap: SPACING.md,
  },
  btn: {
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: COLOURS.textPrimary,
  },
  btnSecondary: {
    backgroundColor: COLOURS.surface,
  },
  btnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  btnTextPrimary: {
    color: COLOURS.background,
  },
  btnTextSecondary: {
    color: COLOURS.textPrimary,
  },
})

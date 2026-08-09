// =============================================================================
// app/settings.tsx — Settings
// Styled as sections of a big Indi-Q card, matching Game Setup: coloured
// card-row bands in the deck's colour order on the warm cream table.
//
//   1. Feedback (blue)   — sound effects, vibration
//   2. Privacy  (green)  — policy link, ad consent (EEA/UK only)
//   3. About    (orange) — version, contact
// =============================================================================

import { useEffect, useState } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Constants from 'expo-constants'
import { showPrivacyOptions, usePrivacyOptionsRequired } from '@/ads'
import { feedback, getFeedbackPrefs, setFeedbackPrefs } from '@/feedback'
import { BRAND_COLOURS } from '@/constants/brandAssets'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { saveFeedbackPrefs, type FeedbackPrefs } from '@/utils/prefs'

const CREAM = BRAND_COLOURS.cream
const INK = BRAND_COLOURS.ink
const HINT = BRAND_COLOURS.hint

const PRIVACY_URL = 'https://adarshanil07.github.io/Indiq.privacypolicy/privacy.html'
const CONTACT_EMAIL = 'adhy.anil2007@gmail.com'

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<FeedbackPrefs>(getFeedbackPrefs)

  // Preferences load asynchronously at launch, so re-read them on mount in
  // case Settings is opened before that finished.
  useEffect(() => {
    setPrefs(getFeedbackPrefs())
  }, [])

  const update = (patch: Partial<FeedbackPrefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    setFeedbackPrefs(next) // live, so the confirming tap already obeys it
    saveFeedbackPrefs(next)
    feedback.tap()
  }

  // Only EEA/UK users are offered this; elsewhere no consent was gathered, so
  // there is nothing to change and the row would be confusing.
  const privacyOptionsRequired = usePrivacyOptionsRequired()

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* 1 · Feedback (blue) */}
        <SectionCard colour={CATEGORY_COLOURS.Object} title="Feedback">
          <ToggleRow
            label="Sound effects"
            hint="Soft taps as you play. Always silent when your phone is on silent."
            value={prefs.sound}
            onValueChange={v => update({ sound: v })}
            colour={CATEGORY_COLOURS.Object}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Vibration"
            hint="A gentle buzz for correct answers, skips and voids."
            value={prefs.haptics}
            onValueChange={v => update({ haptics: v })}
            colour={CATEGORY_COLOURS.Object}
          />
        </SectionCard>

        {/* 2 · Privacy (green) */}
        <SectionCard colour={CATEGORY_COLOURS.Nature} title="Privacy">
          <LinkRow
            label="Privacy policy"
            hint="What data is involved when you play."
            onPress={() => {
              feedback.tap()
              Linking.openURL(PRIVACY_URL)
            }}
          />
          {privacyOptionsRequired && (
            <>
              <View style={styles.divider} />
              <LinkRow
                label="Ad privacy choices"
                hint="Change or withdraw your consent for personalised ads."
                onPress={() => {
                  feedback.tap()
                  showPrivacyOptions()
                }}
              />
            </>
          )}
        </SectionCard>

        {/* 3 · About (orange) */}
        <SectionCard colour={CATEGORY_COLOURS.Movie} title="About">
          <View style={styles.aboutRow}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.aboutValue}>
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
          <View style={styles.divider} />
          <LinkRow
            label="Get in touch"
            hint={CONTACT_EMAIL}
            onPress={() => {
              feedback.tap()
              Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Indi-Q%20feedback`)
            }}
          />
          <View style={styles.divider} />
          <LinkRow
            label="EnJoy Games on Instagram"
            hint="@enjoygames.uk"
            onPress={() => {
              feedback.tap()
              Linking.openURL('https://www.instagram.com/enjoygames.uk')
            }}
          />
        </SectionCard>

        <Text style={styles.footer}>Made with ☸ by EnJoy Games</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Building blocks ─────────────────────────────────────────────────────────
// Mirrors Game Setup: a coloured card-row band heading a white card body, so
// both screens read as sections of the same physical card.

function SectionCard({
  colour,
  title,
  children,
}: {
  colour: string
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionBand, { backgroundColor: colour }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  colour,
}: {
  label: string
  hint: string
  value: boolean
  onValueChange: (v: boolean) => void
  colour: string
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D8CBAE', true: colour }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#D8CBAE"
      />
    </View>
  )
}

function LinkRow({
  label,
  hint,
  onPress,
}: {
  label: string
  hint: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM, paddingHorizontal: 20 },
  scroll: { paddingBottom: 48, gap: 16 },

  header: { paddingTop: 24, gap: 8 },
  backText: { fontFamily: 'Quicksand_700Bold', fontSize: 16, color: HINT },
  title: { fontFamily: 'BalooChettan2_700Bold', fontSize: 30, color: INK, lineHeight: 40 },

  section: {
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  sectionBand: {
    borderBottomWidth: 2.5,
    borderBottomColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sectionTitle: { fontFamily: 'BalooChettan2_700Bold', fontSize: 20, color: INK },
  sectionBody: { paddingHorizontal: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: 'Quicksand_700Bold', fontSize: 16, color: INK },
  rowHint: { fontFamily: 'Quicksand_500Medium', fontSize: 13, color: HINT, lineHeight: 18 },
  chevron: { fontFamily: 'Quicksand_700Bold', fontSize: 24, color: HINT },

  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  aboutValue: { fontFamily: 'BalooChettan2_700Bold', fontSize: 16, color: HINT },

  divider: { height: 1.5, backgroundColor: '#EDE3CC' },

  footer: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: 13,
    color: HINT,
    textAlign: 'center',
    marginTop: 4,
  },
})

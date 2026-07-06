import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useStartGame } from '@/store/GameContext'
import { loadSavedSetup, saveSetup } from '@/utils/setupStorage'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'
import type { ChakraReward } from '@/types/game'

const TIMER_OPTIONS = [30, 45, 60, 90, 120]
const CHAKRA_REWARD_OPTIONS: readonly ChakraReward[] = [1, 2, 3, 'extra-round']
const DEFAULT_TEAM_COUNT = 2
const DEFAULT_TIMER = 60
const DEFAULT_MAX_CARDS = 2

function buildDefaultNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Team ${i + 1}`)
}

export default function SetupScreen() {
  const startGame = useStartGame()

  const [teamCount, setTeamCount] = useState(DEFAULT_TEAM_COUNT)
  const [teamNames, setTeamNames] = useState<string[]>(buildDefaultNames(DEFAULT_TEAM_COUNT))
  const [timerDuration, setTimerDuration] = useState(DEFAULT_TIMER)
  const [maxActiveCards, setMaxActiveCards] = useState(DEFAULT_MAX_CARDS)
  const [boardMode, setBoardMode] = useState(false)
  const [targetScoreText, setTargetScoreText] = useState('')
  const [chakraCardCount, setChakraCardCount] = useState(3)
  const [chakraReward, setChakraReward] = useState<ChakraReward>(1)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Restore the last-used setup (Section 5: options are remembered between games)
  useEffect(() => {
    loadSavedSetup().then(saved => {
      if (!saved) return
      setTeamCount(saved.teamCount)
      setTeamNames(saved.teamNames)
      setTimerDuration(saved.timerDuration)
      setMaxActiveCards(saved.maxActiveCards)
      setBoardMode(saved.boardMode)
      setTargetScoreText(saved.targetScoreText)
      setChakraCardCount(saved.chakraCardCount)
      setChakraReward(saved.chakraReward)
    })
  }, [])

  const handleTeamCountChange = (count: number) => {
    setTeamCount(count)
    setTeamNames(prev => {
      const next = [...prev]
      while (next.length < count) next.push(`Team ${next.length + 1}`)
      return next.slice(0, count)
    })
  }

  const handleStart = () => {
    const names = teamNames.map(n => n.trim()).filter(Boolean)
    if (names.length < 2) {
      setValidationError('Please name at least 2 teams.')
      return
    }

    const targetScore = targetScoreText.trim()
      ? parseInt(targetScoreText.trim(), 10)
      : undefined

    if (targetScoreText.trim() && (!targetScore || targetScore < 1)) {
      setValidationError('Target score must be a number greater than 0, or left blank.')
      return
    }

    setValidationError(null)

    saveSetup({
      teamCount,
      teamNames,
      timerDuration,
      maxActiveCards,
      boardMode,
      targetScoreText,
      chakraCardCount,
      chakraReward,
    })

    startGame({
      teamNames: names,
      timerDuration,
      maxActiveCards,
      chakraCardCount,
      chakraReward,
      boardMode,
      targetScore,
    })

    router.replace('/game')
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Game Setup</Text>
          </View>

          {/* Teams */}
          <Section label="Number of Teams">
            <SegmentedPicker
              options={[2, 3, 4]}
              value={teamCount}
              onSelect={handleTeamCountChange}
              formatLabel={n => `${n}`}
            />
          </Section>

          <Section label="Team Names">
            {teamNames.slice(0, teamCount).map((name, idx) => (
              <TextInput
                key={idx}
                style={styles.textInput}
                value={name}
                onChangeText={text =>
                  setTeamNames(prev => prev.map((n, i) => (i === idx ? text : n)))
                }
                placeholder={`Team ${idx + 1}`}
                placeholderTextColor={COLOURS.textSecondary}
                maxLength={20}
              />
            ))}
          </Section>

          {/* Timer */}
          <Section label="Timer Duration">
            <SegmentedPicker
              options={TIMER_OPTIONS}
              value={timerDuration}
              onSelect={setTimerDuration}
              formatLabel={n => `${n}s`}
            />
          </Section>

          {/* Skips */}
          <Section label="Skips per Turn">
            <SegmentedPicker
              options={[1, 2, 3]}
              value={maxActiveCards}
              onSelect={setMaxActiveCards}
              formatLabel={n => `${n}`}
            />
            <Text style={styles.hint}>
              Maximum cards visible on screen at once. Using a skip draws a new card alongside
              the current one.
            </Text>
          </Section>

          {/* Board mode */}
          <Section label="Board Mode">
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {boardMode ? 'Digital board enabled' : 'Card-only mode'}
              </Text>
              <Switch
                value={boardMode}
                onValueChange={setBoardMode}
                trackColor={{ true: COLOURS.textPrimary }}
              />
            </View>
            <Text style={styles.hint}>
              {boardMode
                ? 'Category is determined by your board position.'
                : 'Your team picks the category each turn.'}
            </Text>
          </Section>

          {/* Target score — only in no-board mode */}
          {!boardMode && (
            <Section label="Target Score (optional)">
              <TextInput
                style={styles.textInput}
                value={targetScoreText}
                onChangeText={setTargetScoreText}
                placeholder="Leave blank for open-ended play"
                placeholderTextColor={COLOURS.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Text style={styles.hint}>First team to reach this score wins.</Text>
            </Section>
          )}

          {/* Chakra cards */}
          <Section label="Chakra Cards">
            <SegmentedPicker
              options={[2, 3, 4, 5]}
              value={chakraCardCount}
              onSelect={setChakraCardCount}
              formatLabel={n => `${n}`}
            />
            <Text style={styles.hint}>Cards shown to the describer during Chakra Mode.</Text>
          </Section>

          {/* Chakra reward */}
          <Section label="Chakra Reward">
            <SegmentedPicker
              options={CHAKRA_REWARD_OPTIONS}
              value={chakraReward}
              onSelect={setChakraReward}
              formatLabel={r => (r === 'extra-round' ? 'Extra Round' : `+${r}`)}
            />
            <Text style={styles.hint}>
              {chakraReward === 'extra-round'
                ? 'The team that guesses the Chakra word first plays a bonus round.'
                : `The team that guesses the Chakra word first gains ${chakraReward} point${chakraReward === 1 ? '' : 's'}.`}
            </Text>
          </Section>

          {/* Validation error */}
          {validationError && <Text style={styles.errorText}>{validationError}</Text>}

          {/* Start button */}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>Start Game</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Small reusable sub-components ──────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.label}>{label}</Text>
      {children}
    </View>
  )
}

function SegmentedPicker<T extends number | string>({
  options,
  value,
  onSelect,
  formatLabel,
}: {
  options: readonly T[]
  value: T
  onSelect: (v: T) => void
  formatLabel: (v: T) => string
}) {
  return (
    <View style={pickerStyles.row}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[pickerStyles.option, opt === value && pickerStyles.optionActive]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.7}
        >
          <Text
            style={[pickerStyles.optionText, opt === value && pickerStyles.optionTextActive]}
          >
            {formatLabel(opt)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.background,
  },
  scroll: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  header: {
    paddingTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  backBtn: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textSecondary,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  textInput: {
    backgroundColor: COLOURS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLOURS.textPrimary,
    marginBottom: SPACING.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOURS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  toggleLabel: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textPrimary,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLOURS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: COLOURS.textPrimary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  startBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLOURS.background,
  },
})

const sectionStyles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLOURS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})

const pickerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  option: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLOURS.surface,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: COLOURS.textPrimary,
  },
  optionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLOURS.textSecondary,
  },
  optionTextActive: {
    color: COLOURS.background,
  },
})

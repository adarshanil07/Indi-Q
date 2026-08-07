// =============================================================================
// app/setup.tsx — Game Setup
// Styled as "filling out a big Indi-Q card": six sections, each headed by a
// coloured card-row band in the deck's colour order (yellow, purple, blue,
// orange, green, red), options picked via card-style tiles, on the same warm
// cream table as Just Cards.
//
//   1. Teams        (yellow) — count + coloured name fields
//   2. Timer        (purple)
//   3. Skips        (blue)
//   4. Game Board   (orange)
//   5. Chakra       (green) — card count + reward, ☸ accent
//   6. Target Score (red)   — no-board mode only
// =============================================================================

import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Slider from '@react-native-community/slider'
import { router } from 'expo-router'
import { useStartGame } from '@/store/GameContext'
import { AdBanner } from '@/ads'
import { Chakra } from '@/components/card/Chakra'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { BRAND_COLOURS } from '@/constants/brandAssets'
import {
  UNLIMITED_SKIPS,
  isUnlimitedSkips,
  maxActiveCardsForSkips,
} from '@/constants/gameRules'
import { TEAM_COLOURS } from '@/constants/teams'
import { loadSavedSetup, saveSetup } from '@/utils/setupStorage'
import type { ChakraReward } from '@/types/game'

const CREAM = '#FFF6E3'
const INK = BRAND_COLOURS.ink
const HINT = '#6B5B3E'

const TIMER_MIN = 15
const TIMER_MAX = 180
const TIMER_STEP = 5
const CHAKRA_REWARD_OPTIONS: readonly ChakraReward[] = [1, 2, 3, 'extra-round']
const DEFAULT_TEAM_COUNT = 2
const DEFAULT_TIMER = 60
const DEFAULT_SKIPS = 1

function buildDefaultNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Team ${i + 1}`)
}

export default function SetupScreen() {
  const startGame = useStartGame()

  const [teamCount, setTeamCount] = useState(DEFAULT_TEAM_COUNT)
  const [teamNames, setTeamNames] = useState<string[]>(buildDefaultNames(DEFAULT_TEAM_COUNT))
  const [timerDuration, setTimerDuration] = useState(DEFAULT_TIMER)
  const [skipsAllowed, setSkipsAllowed] = useState(DEFAULT_SKIPS)
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
      setSkipsAllowed(saved.skipsAllowed)
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
    // Only the teams actually being played: teamNames can hold stale entries
    // from a previously larger team count.
    const names = teamNames.slice(0, teamCount).map(n => n.trim())
    if (names.some(n => n.length === 0)) {
      setValidationError('Please give every team a name.')
      return
    }
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
      skipsAllowed,
      boardMode,
      targetScoreText,
      chakraCardCount,
      chakraReward,
    })

    startGame({
      teamNames: names,
      timerDuration,
      maxActiveCards: maxActiveCardsForSkips(skipsAllowed),
      chakraCardCount,
      chakraReward,
      boardMode,
      // Target score is a no-board concept — never leaks into board games
      targetScore: boardMode ? undefined : targetScore,
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
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Game Setup</Text>
          </View>

          {/* Scrolls with the form, keeping it well clear of Start Game at the
              bottom of the page. */}
          <AdBanner />

          {/* 1 · Teams (yellow) */}
          <SectionCard colour={CATEGORY_COLOURS.People} title="Teams">
            <TilePicker
              options={[2, 3, 4]}
              value={teamCount}
              onSelect={handleTeamCountChange}
              colour={CATEGORY_COLOURS.People}
              formatLabel={n => `${n}`}
            />
            <View style={styles.teamList}>
              {teamNames.slice(0, teamCount).map((name, idx) => (
                <View key={idx} style={styles.teamRow}>
                  <View style={[styles.teamChip, { backgroundColor: TEAM_COLOURS[idx] }]} />
                  <TextInput
                    style={styles.teamInput}
                    value={name}
                    onChangeText={text =>
                      setTeamNames(prev => prev.map((n, i) => (i === idx ? text : n)))
                    }
                    placeholder={`Team ${idx + 1}`}
                    placeholderTextColor={HINT}
                    maxLength={20}
                  />
                </View>
              ))}
            </View>
          </SectionCard>

          {/* 2 · Timer (purple) */}
          <SectionCard colour={CATEGORY_COLOURS.Location} title="Timer">
            <Text style={styles.timerValue}>{timerDuration}s</Text>
            <Slider
              minimumValue={TIMER_MIN}
              maximumValue={TIMER_MAX}
              step={TIMER_STEP}
              value={timerDuration}
              onValueChange={setTimerDuration}
              minimumTrackTintColor={CATEGORY_COLOURS.Location}
              maximumTrackTintColor="rgba(0,0,0,0.15)"
              thumbTintColor={CATEGORY_COLOURS.Location}
            />
            <View style={styles.sliderCaptions}>
              <Text style={styles.hint}>{TIMER_MIN}s</Text>
              <Text style={styles.hint}>How long each turn lasts</Text>
              <Text style={styles.hint}>{TIMER_MAX}s</Text>
            </View>
          </SectionCard>

          {/* 3 · Skips (blue) */}
          <SectionCard colour={CATEGORY_COLOURS.Object} title="Skips">
            <TilePicker
              options={[1, 2, 3, UNLIMITED_SKIPS]}
              value={skipsAllowed}
              onSelect={setSkipsAllowed}
              colour={CATEGORY_COLOURS.Object}
              formatLabel={n => (isUnlimitedSkips(n) ? '∞' : `${n}`)}
            />
            <Text style={styles.hint}>
              {isUnlimitedSkips(skipsAllowed)
                ? 'Unlimited: skip as often as you like; every skipped card stays on screen.'
                : `How many times a team can skip per turn. Each skipped card stays on screen alongside the new one, so up to ${maxActiveCardsForSkips(skipsAllowed)} cards can be visible at once.`}
            </Text>
          </SectionCard>

          {/* 4 · Game Board (orange) */}
          <SectionCard colour={CATEGORY_COLOURS.Movie} title="Game Board">
            <TilePicker
              options={['cards', 'board'] as const}
              value={boardMode ? 'board' : 'cards'}
              onSelect={v => setBoardMode(v === 'board')}
              colour={CATEGORY_COLOURS.Movie}
              formatLabel={v => (v === 'cards' ? 'Cards Only' : 'Digital Board')}
            />
            <Text style={styles.hint}>
              {boardMode
                ? 'Category is determined by your board position.'
                : 'Your team picks the category each turn.'}
            </Text>
          </SectionCard>

          {/* 5 · Chakra (green) */}
          <SectionCard
            colour={CATEGORY_COLOURS.Nature}
            title="Chakra Round"
            accessory={<Chakra bgColor={CATEGORY_COLOURS.Nature} size={22} />}
          >
            <Text style={styles.subLabel}>Cards shown to the describer</Text>
            <TilePicker
              options={[2, 3, 4, 5]}
              value={chakraCardCount}
              onSelect={setChakraCardCount}
              colour={CATEGORY_COLOURS.Nature}
              formatLabel={n => `${n}`}
            />
            <Text style={styles.subLabel}>Reward for the winning team</Text>
            <TilePicker
              options={CHAKRA_REWARD_OPTIONS}
              value={chakraReward}
              onSelect={setChakraReward}
              colour={CATEGORY_COLOURS.Nature}
              formatLabel={r => (r === 'extra-round' ? 'Extra Round' : `+${r}`)}
            />
            <Text style={styles.hint}>
              {chakraReward === 'extra-round'
                ? 'The team that guesses the Chakra word first plays a bonus round.'
                : `The team that guesses the Chakra word first gains ${chakraReward} point${
                    chakraReward === 1 ? '' : 's'
                  }.`}
            </Text>
          </SectionCard>

          {/* 6 · Target Score (red) — no-board mode only */}
          {!boardMode && (
            <SectionCard colour={CATEGORY_COLOURS.Random} title="Target Score">
              <TextInput
                style={styles.scoreInput}
                value={targetScoreText}
                onChangeText={setTargetScoreText}
                placeholder="Leave blank for open-ended play"
                placeholderTextColor={HINT}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Text style={styles.hint}>First team to reach this score wins.</Text>
            </SectionCard>
          )}

          {/* Validation error */}
          {validationError && <Text style={styles.errorText}>{validationError}</Text>}

          {/* Start button */}
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
          >
            <Text style={styles.startBtnText}>Start Game</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Section framed like a card row ─────────────────────────────────────────

function SectionCard({
  colour,
  title,
  accessory,
  children,
}: {
  colour: string
  title: string
  accessory?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <View style={sectionStyles.card}>
      <View style={[sectionStyles.band, { backgroundColor: colour }]}>
        <Text style={sectionStyles.bandText}>{title}</Text>
        {accessory && <View style={sectionStyles.accessory}>{accessory}</View>}
      </View>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  )
}

// ── Card-tile option picker ─────────────────────────────────────────────────
// White tiles with the card's black border; the selected tile fills with the
// section's colour (black text throughout, like the card's own rows).

function TilePicker<T extends number | string>({
  options,
  value,
  onSelect,
  colour,
  formatLabel,
}: {
  options: readonly T[]
  value: T
  onSelect: (v: T) => void
  colour: string
  formatLabel: (v: T) => string
}) {
  return (
    <View style={tileStyles.row}>
      {options.map(opt => {
        const selected = opt === value
        return (
          <Pressable
            key={String(opt)}
            onPress={() => onSelect(opt)}
            style={({ pressed }) => [
              tileStyles.tile,
              selected && { backgroundColor: colour },
              pressed && tileStyles.tilePressed,
            ]}
          >
            <Text style={tileStyles.tileText} numberOfLines={1} adjustsFontSizeToFit>
              {formatLabel(opt)}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 18,
  },
  header: {
    paddingTop: 16,
    gap: 6,
  },
  backText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: HINT,
  },
  title: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 30,
    color: INK,
    lineHeight: 40,
  },

  teamList: {
    gap: 10,
    marginTop: 4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamChip: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#000000',
  },
  teamInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: INK,
  },

  scoreInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: INK,
  },

  timerValue: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 30,
    color: INK,
    textAlign: 'center',
    lineHeight: 38,
  },
  sliderCaptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subLabel: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: HINT,
    marginTop: 2,
  },
  hint: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 12.5,
    color: HINT,
    opacity: 0.85,
    lineHeight: 18,
  },

  errorText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 14,
    color: '#E41D1F',
    textAlign: 'center',
  },

  startBtn: {
    backgroundColor: BRAND_COLOURS.orange,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#7a4a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  startBtnPressed: {
    transform: [{ scale: 0.97 }, { translateY: 2 }],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    elevation: 2,
  },
  startBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 19,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})

const sectionStyles = StyleSheet.create({
  card: {
    gap: 12,
  },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bandText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 17,
    color: '#000000',
  },
  accessory: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 10,
    paddingHorizontal: 2,
  },
})

const tileStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePressed: {
    transform: [{ scale: 0.95 }],
  },
  tileText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: '#000000',
  },
})

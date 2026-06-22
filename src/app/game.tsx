import React, { useCallback, useState } from 'react'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useGame } from '@/store/GameContext'
import { CardStack } from '@/components/card/CardStack'
import { CountdownTimer } from '@/components/ui/CountdownTimer'
import { TeamScoreBar } from '@/components/ui/TeamScoreBar'
import { CATEGORIES, CATEGORY_COLOURS } from '@/constants/categories'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'
import type { Category, Team } from '@/types/game'

export default function GameScreen() {
  const { state, dispatch } = useGame()
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [editScoreText, setEditScoreText] = useState('')

  // Navigate to results as soon as phase flips to finished
  React.useEffect(() => {
    if (state.phase === 'finished') {
      router.replace('/results')
    }
  }, [state.phase])

  // ── Dispatch wrappers ─────────────────────────────────────────────────
  const handleTimerExpired = useCallback(
    () => dispatch({ type: 'TIMER_EXPIRED' }),
    [dispatch],
  )

  const handleReveal = () => {
    if (!state.config.boardMode && !state.currentTurn?.selectedCategory) {
      Alert.alert('Choose a category first', 'Select a category before revealing the card.')
      return
    }
    dispatch({ type: 'REVEAL_CARD' })
  }
  const handleSelectCategory = (cat: Category) => dispatch({ type: 'SELECT_CATEGORY', category: cat })
  const handleCorrect = (cardId: string) => dispatch({ type: 'MARK_CORRECT', cardId })
  const handleVoid = (cardId: string) => dispatch({ type: 'VOID_CARD', cardId })
  const handleSkip = () => dispatch({ type: 'SKIP' })
  const handleConfirmTurnEnd = () => dispatch({ type: 'CONFIRM_TURN_END' })
  const handleStartTurn = () => dispatch({ type: 'START_TURN' })
  const handleUndo = () => {
    Alert.alert(
      'Undo Last Turn',
      'This will reverse the previous turn — scores, cards, and team order will be restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Undo', style: 'destructive', onPress: () => dispatch({ type: 'UNDO' }) },
      ],
    )
  }

  const handleEndGame = () => {
    Alert.alert('End Game', 'Are you sure you want to end the game?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => dispatch({ type: 'END_GAME' }) },
    ])
  }

  // ── Manual score editing ──────────────────────────────────────────────
  const openEditScore = (teamId: string) => {
    const team = state.teams.find(t => t.id === teamId)
    if (!team) return
    setEditTarget(team)
    setEditScoreText(String(team.score))
  }

  const submitEditScore = () => {
    if (!editTarget) return
    const n = parseInt(editScoreText, 10)
    if (isNaN(n) || n < 0) {
      Alert.alert('Invalid score', 'Enter a number of 0 or more.')
      return
    }
    dispatch({ type: 'SET_TEAM_SCORE', teamId: editTarget.id, score: n })
    setEditTarget(null)
  }

  if (state.phase === 'setup' || state.phase === 'finished') return null

  const { teams, activeTeamIndex, currentTurn, config } = state
  const activeTeam = teams[activeTeamIndex]

  // ── Phase: between turns ──────────────────────────────────────────────
  if (!currentTurn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TeamScoreBar
            teams={teams}
            activeTeamId={activeTeam.id}
            onLongPressTeam={openEditScore}
          />
          <View style={styles.headerActions}>
            {state.turnHistory.length > 0 && (
              <TouchableOpacity onPress={handleUndo} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Undo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleEndGame} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { color: COLOURS.danger }]}>End</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.interstitial}>
          <Text style={styles.interstitialLabel}>Next up</Text>
          <Text style={styles.interstitialTeam}>{activeTeam.name}</Text>
          <Text style={styles.interstitialSub}>Pass the phone to your team</Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleStartTurn} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Start Turn →</Text>
        </TouchableOpacity>

        <ScoreEditModal
          team={editTarget}
          scoreText={editScoreText}
          onChangeText={setEditScoreText}
          onCancel={() => setEditTarget(null)}
          onConfirm={submitEditScore}
        />
      </SafeAreaView>
    )
  }

  const { phase, activeCards, selectedCategory, timerStartedAt, correctIds, voidedIds } = currentTurn
  const skipsRemaining = config.maxActiveCards - activeCards.length

  // ── Phase: active turn ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Score bar */}
      <View style={styles.header}>
        <TeamScoreBar
          teams={teams}
          activeTeamId={activeTeam.id}
          onLongPressTeam={openEditScore}
        />
      </View>

      {/* Team label */}
      <Text style={styles.turnTeamLabel}>
        {activeTeam.name}
        {correctIds.length > 0 && (
          <Text style={styles.correctCount}> +{correctIds.length}</Text>
        )}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category picker — no-board mode, before card is revealed */}
        {!config.boardMode && phase === 'waiting' && (
          <CategoryPicker
            selectedCategory={selectedCategory}
            onSelect={handleSelectCategory}
          />
        )}

        {/* Locked category label for board mode */}
        {config.boardMode && selectedCategory && (
          <View style={[styles.lockedCategory, { backgroundColor: CATEGORY_COLOURS[selectedCategory] }]}>
            <Text style={styles.lockedCategoryText}>{selectedCategory}</Text>
          </View>
        )}

        {/* Card stack */}
        <CardStack
          cards={activeCards}
          phase={phase}
          selectedCategory={selectedCategory}
          correctIds={correctIds}
          voidedIds={voidedIds}
          skipsRemaining={skipsRemaining}
          onReveal={handleReveal}
          onCorrect={handleCorrect}
          onVoid={handleVoid}
          onSkip={handleSkip}
        />
      </ScrollView>

      {/* Timer */}
      <View style={styles.timerSection}>
        <CountdownTimer
          timerStartedAt={timerStartedAt}
          durationSeconds={config.timerDuration}
          onExpired={handleTimerExpired}
        />
      </View>

      {/* End turn confirm button (only visible after timer expires) */}
      {phase === 'ended' && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleConfirmTurnEnd}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>End Turn →</Text>
        </TouchableOpacity>
      )}

      <ScoreEditModal
        team={editTarget}
        scoreText={editScoreText}
        onChangeText={setEditScoreText}
        onCancel={() => setEditTarget(null)}
        onConfirm={submitEditScore}
      />
    </SafeAreaView>
  )
}

// ── Category picker component ──────────────────────────────────────────────

function CategoryPicker({
  selectedCategory,
  onSelect,
}: {
  selectedCategory: Category | null
  onSelect: (cat: Category) => void
}) {
  return (
    <View style={catStyles.container}>
      <Text style={catStyles.label}>Choose a category</Text>
      <View style={catStyles.grid}>
        {CATEGORIES.map(cat => {
          const isSelected = cat === selectedCategory
          const colour = CATEGORY_COLOURS[cat]
          return (
            <TouchableOpacity
              key={cat}
              style={[catStyles.chip, isSelected && { backgroundColor: colour, borderColor: colour }]}
              onPress={() => onSelect(cat)}
              activeOpacity={0.75}
            >
              <View style={[catStyles.dot, { backgroundColor: colour }]} />
              <Text style={[catStyles.chipText, isSelected && catStyles.chipTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ── Score edit modal ───────────────────────────────────────────────────────

function ScoreEditModal({
  team,
  scoreText,
  onChangeText,
  onCancel,
  onConfirm,
}: {
  team: Team | null
  scoreText: string
  onChangeText: (t: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal visible={!!team} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Edit Score</Text>
          <Text style={modalStyles.subtitle}>{team?.name}</Text>
          <TextInput
            style={modalStyles.input}
            value={scoreText}
            onChangeText={onChangeText}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
          />
          <View style={modalStyles.btns}>
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnCancel]} onPress={onCancel}>
              <Text style={modalStyles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnConfirm]} onPress={onConfirm}>
              <Text style={modalStyles.btnConfirmText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.background,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  headerBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  headerBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLOURS.textSecondary,
  },
  interstitial: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  interstitialLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLOURS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  interstitialTeam: {
    fontSize: 48,
    fontWeight: '900',
    color: COLOURS.textPrimary,
    textAlign: 'center',
  },
  interstitialSub: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textSecondary,
    textAlign: 'center',
  },
  turnTeamLabel: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  correctCount: {
    color: COLOURS.correct,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  lockedCategory: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignSelf: 'flex-start',
  },
  lockedCategoryText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#fff',
  },
  timerSection: {
    paddingVertical: SPACING.sm,
  },
  primaryBtn: {
    backgroundColor: COLOURS.textPrimary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  primaryBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLOURS.background,
  },
})

const catStyles = StyleSheet.create({
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLOURS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLOURS.textPrimary,
  },
  chipTextSelected: {
    color: '#fff',
  },
})

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  sheet: {
    backgroundColor: COLOURS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '100%',
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textSecondary,
    marginTop: -SPACING.sm,
  },
  input: {
    backgroundColor: COLOURS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLOURS.textPrimary,
    textAlign: 'center',
  },
  btns: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: COLOURS.surface,
  },
  btnCancelText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLOURS.textPrimary,
  },
  btnConfirm: {
    backgroundColor: COLOURS.textPrimary,
  },
  btnConfirmText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLOURS.background,
  },
})

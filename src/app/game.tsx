import React, { useCallback, useState } from 'react'
import {
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
import { ChakraRound } from '@/components/chakra/ChakraRound'
import { CategoryBar } from '@/components/ui/CategoryBar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CountdownTimer } from '@/components/ui/CountdownTimer'
import { TeamScoreBar } from '@/components/ui/TeamScoreBar'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'
import type { Card, Category, Team } from '@/types/game'

/** Which destructive action is awaiting confirmation. */
type PendingConfirm = 'undo' | 'end' | 'restart' | null

const CONFIRM_COPY: Record<Exclude<PendingConfirm, null>, {
  title: string
  message: string
  confirmLabel: string
}> = {
  undo: {
    title: 'Undo Last Turn',
    message: 'This will reverse the previous turn — scores, cards, and team order will be restored.',
    confirmLabel: 'Undo',
  },
  end: {
    title: 'End Game',
    message: 'Are you sure you want to end the game? Final scores will be shown.',
    confirmLabel: 'End Game',
  },
  restart: {
    title: 'Restart Turn',
    message: 'Discard the cards on screen and start again with a fresh card and full timer? Points already scored this turn are kept.',
    confirmLabel: 'Restart',
  },
}

export default function GameScreen() {
  const { state, dispatch } = useGame()
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [editScoreText, setEditScoreText] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null)

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

  // Reveal is blocked until a category is chosen (no-board mode) — the card
  // overlay itself explains this, so a blocked tap simply does nothing.
  const handleReveal = () => {
    if (!state.config.boardMode && !state.currentTurn?.selectedCategory) return
    dispatch({ type: 'REVEAL_CARD' })
  }
  const handleSelectCategory = (cat: Category) => dispatch({ type: 'SELECT_CATEGORY', category: cat })
  const handleCorrect = (cardId: string) => dispatch({ type: 'MARK_CORRECT', cardId })
  const handleVoid = (cardId: string) => dispatch({ type: 'VOID_CARD', cardId })
  const handleSkip = () => dispatch({ type: 'SKIP' })
  const handleConfirmTurnEnd = () => dispatch({ type: 'CONFIRM_TURN_END' })
  const handleStartTurn = () => dispatch({ type: 'START_TURN' })

  // Chakra round (Section 7)
  const handleTriggerChakra = () => dispatch({ type: 'TRIGGER_CHAKRA' })
  const handleSelectChakraCard = (card: Card) => dispatch({ type: 'SELECT_CHAKRA_CARD', card })
  const handleChakraWinner = (winningTeamId: string) =>
    dispatch({ type: 'CHAKRA_CORRECT', winningTeamId })
  const handleConfirmChakraEnd = () => dispatch({ type: 'CONFIRM_CHAKRA_END' })

  // Destructive actions confirm through a centred dialog (Alert.alert is a
  // silent no-op on web, which made these buttons appear broken).
  const runPendingConfirm = () => {
    if (pendingConfirm === 'undo') dispatch({ type: 'UNDO' })
    if (pendingConfirm === 'end') dispatch({ type: 'END_GAME' })
    if (pendingConfirm === 'restart') dispatch({ type: 'RESTART_TURN' })
    setPendingConfirm(null)
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
    // Invalid input: keep the modal open until a valid number is entered
    if (isNaN(n) || n < 0) return
    dispatch({ type: 'SET_TEAM_SCORE', teamId: editTarget.id, score: n })
    setEditTarget(null)
  }

  if (state.phase === 'setup' || state.phase === 'finished') return null

  const { teams, activeTeamIndex, currentTurn, config } = state
  const activeTeam = teams[activeTeamIndex]
  const isBonusTurn = state.resumeTeamIndex !== null

  // ── Phase: Chakra round ───────────────────────────────────────────────
  if (state.phase === 'chakra' && state.chakraState) {
    return (
      <SafeAreaView style={styles.container}>
        <ChakraRound
          chakraState={state.chakraState}
          teams={teams}
          reward={config.chakraReward}
          onSelectCard={handleSelectChakraCard}
          onTeamWon={handleChakraWinner}
          onEndWithoutWinner={handleConfirmChakraEnd}
          onConfirmEnd={handleConfirmChakraEnd}
        />
      </SafeAreaView>
    )
  }

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
            <TouchableOpacity onPress={() => router.push('/completed')} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Words</Text>
            </TouchableOpacity>
            {state.turnHistory.length > 0 && (
              <TouchableOpacity onPress={() => setPendingConfirm('undo')} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Undo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setPendingConfirm('end')} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { color: COLOURS.danger }]}>End</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.interstitial}>
          <Text style={styles.interstitialLabel}>
            {isBonusTurn ? '☸ Chakra Bonus Round' : 'Next up'}
          </Text>
          <Text style={styles.interstitialTeam}>{activeTeam.name}</Text>
          <Text style={styles.interstitialSub}>
            {isBonusTurn
              ? 'You earned an extra round — make it count!'
              : 'Pass the phone to your team'}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleStartTurn} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Start Turn →</Text>
        </TouchableOpacity>

        {/* Chakra trigger — no-board mode only, not before a bonus turn */}
        {!config.boardMode && !isBonusTurn && (
          <TouchableOpacity
            style={styles.chakraBtn}
            onPress={handleTriggerChakra}
            activeOpacity={0.85}
          >
            <Text style={styles.chakraBtnText}>☸ Chakra Round</Text>
          </TouchableOpacity>
        )}

        <ScoreEditModal
          team={editTarget}
          scoreText={editScoreText}
          onChangeText={setEditScoreText}
          onCancel={() => setEditTarget(null)}
          onConfirm={submitEditScore}
        />

        {pendingConfirm && (
          <ConfirmDialog
            visible
            {...CONFIRM_COPY[pendingConfirm]}
            onCancel={() => setPendingConfirm(null)}
            onConfirm={runPendingConfirm}
          />
        )}
      </SafeAreaView>
    )
  }

  const { phase, activeCards, selectedCategory, timerStartedAt, correctIds, voidedIds } = currentTurn
  const skipsRemaining = config.maxActiveCards - activeCards.length
  const needsCategory = !config.boardMode && phase === 'waiting' && selectedCategory === null

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

      {/* Chakra bonus round banner */}
      {isBonusTurn && (
        <View style={styles.bonusBanner}>
          <Text style={styles.bonusBannerText}>☸ CHAKRA BONUS ROUND</Text>
        </View>
      )}

      {/* Team label + words / restart */}
      <View style={styles.turnLabelRow}>
        <Text style={styles.turnTeamLabel}>
          {activeTeam.name}
          {correctIds.length > 0 && (
            <Text style={styles.correctCount}> +{correctIds.length}</Text>
          )}
        </Text>
        <View style={styles.turnLabelActions}>
          <TouchableOpacity onPress={() => router.push('/completed')} hitSlop={8}>
            <Text style={styles.restartBtnText}>Words</Text>
          </TouchableOpacity>
          {phase === 'active' && (
            <TouchableOpacity onPress={() => setPendingConfirm('restart')} hitSlop={8}>
              <Text style={styles.restartBtnText}>Restart</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          needsCategory={needsCategory}
          onReveal={handleReveal}
          onCorrect={handleCorrect}
          onVoid={handleVoid}
          onSkip={handleSkip}
        />
      </ScrollView>

      {/* Category bar — below the card, above the timer (no-board mode).
          Interactive only before the card is revealed. */}
      {!config.boardMode && (
        <CategoryBar
          selectedCategory={selectedCategory}
          onSelect={handleSelectCategory}
          interactive={phase === 'waiting'}
        />
      )}

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

      {pendingConfirm && (
        <ConfirmDialog
          visible
          {...CONFIRM_COPY[pendingConfirm]}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={runPendingConfirm}
        />
      )}
    </SafeAreaView>
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
  turnLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  turnLabelActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  turnTeamLabel: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  restartBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLOURS.textSecondary,
  },
  bonusBanner: {
    backgroundColor: COLOURS.textPrimary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  bonusBannerText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLOURS.background,
    letterSpacing: 1.5,
  },
  chakraBtn: {
    borderWidth: 2,
    borderColor: COLOURS.textPrimary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  chakraBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
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

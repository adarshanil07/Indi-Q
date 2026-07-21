// =============================================================================
// app/game.tsx — Full Game screen
// Themed in the Indi-Q card language (cream table, black borders, deck
// colours, brand fonts). Layout contract:
//
//   • Score chips (team identity colours) — always at the top.
//   • Utility pill row (Words · Undo · Restart · End) — always visible in the
//     same place; buttons fade when unavailable instead of disappearing.
//   • Main area — interstitial splash between turns, card stack during them.
//   • Category bar above the timer band (no-board mode).
//   • Bottom slot: depleting timer band during play, which becomes the
//     "End Turn" button when time is up. "Start Turn" is the interstitial CTA.
//
// Game mechanics (reducer/actions) are untouched — this is presentation only.
// =============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useGame } from '@/store/GameContext'
import { BoardTrack } from '@/components/board/BoardTrack'
import { CardStack } from '@/components/card/CardStack'
import { Chakra } from '@/components/card/Chakra'
import { ChakraRound } from '@/components/chakra/ChakraRound'
import { CategoryBar } from '@/components/ui/CategoryBar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CountdownTimer } from '@/components/ui/CountdownTimer'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { Pop } from '@/components/ui/Pop'
import { TeamScoreBar } from '@/components/ui/TeamScoreBar'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { BRAND_COLOURS } from '@/constants/brandAssets'
import { isUnlimitedSkips } from '@/constants/gameRules'
import { teamColourAt } from '@/constants/teams'
import { loadCardLanguage, saveCardLanguage, type CardLanguage } from '@/utils/prefs'
import type { Card, Category, Team } from '@/types/game'

const CREAM = BRAND_COLOURS.cream
const INK = BRAND_COLOURS.ink
const HINT = BRAND_COLOURS.hint

/** Which destructive action is awaiting confirmation. */
type PendingConfirm = 'undo' | 'end' | 'restart' | null

const CONFIRM_COPY: Record<Exclude<PendingConfirm, null>, {
  title: string
  message: string
  confirmLabel: string
}> = {
  undo: {
    title: 'Undo Last Turn',
    message: 'This will reverse the previous turn: scores, cards, and team order will be restored.',
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
  const [showCorrections, setShowCorrections] = useState(false)

  // Card language (EN | മ) — shared preference with Just Cards
  const [language, setLanguage] = useState<CardLanguage>('en')
  useEffect(() => {
    loadCardLanguage().then(l => l && setLanguage(l))
  }, [])
  const setLang = (l: CardLanguage) => {
    setLanguage(l)
    saveCardLanguage(l)
  }

  // Navigate to results as soon as phase flips to finished
  React.useEffect(() => {
    if (state.phase === 'finished') {
      router.replace('/results')
    }
  }, [state.phase])

  // Board ☸ landings pause on a "landed" screen (board stays mounted, the
  // walk animation plays) until the player taps into the chakra round.
  // Synchronous gating — the ChakraRound tree must never mount first, or the
  // board unmounts and the walk is lost.
  const [chakraEntered, setChakraEntered] = useState(false)
  useEffect(() => {
    if (state.phase !== 'chakra') setChakraEntered(false)
  }, [state.phase])

  // ── Dispatch wrappers ─────────────────────────────────────────────────
  const handleTimerExpired = useCallback(
    () => dispatch({ type: 'TIMER_EXPIRED' }),
    [dispatch],
  )

  // A category must exist before reveal unless the turn plays ☸ words
  // (bonus turns, or board turns started on a ☸ space).
  const handleReveal = () => {
    if (!state.currentTurn?.chakraWords && !state.currentTurn?.selectedCategory) return
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
    if (isNaN(n) || n < 0) return
    dispatch({ type: 'SET_TEAM_SCORE', teamId: editTarget.id, score: n })
    setEditTarget(null)
  }

  if (state.phase === 'setup' || state.phase === 'finished') return null

  const { teams, activeTeamIndex, currentTurn, config } = state
  const activeTeam = teams[activeTeamIndex]
  const activeColour = teamColourAt(activeTeamIndex)
  const isBonusTurn = state.resumeTeamIndex !== null
  const finalRound = state.finalRound
  const finalTriggerName =
    finalRound && (teams.find(t => t.id === finalRound.triggeredBy)?.name ?? '')

  // Utility availability — buttons never move, they fade.
  const canUndo =
    state.phase === 'playing' && currentTurn === null && state.turnHistory.length > 0
  const canRestart = currentTurn?.phase === 'active'

  const shared = (
    <>
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
    </>
  )

  const header = (
    <View style={styles.header}>
      {config.boardMode ? (
        <BoardTrack
          teams={teams}
          positions={state.boardPositions}
          activeTeamIndex={activeTeamIndex}
          turnActive={currentTurn !== null}
        />
      ) : (
        <TeamScoreBar
          teams={teams}
          activeTeamId={activeTeam.id}
          targetScore={config.targetScore}
          onLongPressTeam={openEditScore}
        />
      )}
      {/* Utility row — same four buttons, always here */}
      <View style={styles.utilityRow}>
        <UtilityButton label="Words" onPress={() => router.push('/completed')} />
        <UtilityButton
          label="Undo"
          disabled={!canUndo}
          onPress={() => setPendingConfirm('undo')}
        />
        <UtilityButton
          label="Restart"
          disabled={!canRestart}
          onPress={() => setPendingConfirm('restart')}
        />
        <UtilityButton
          label="End"
          danger
          onPress={() => setPendingConfirm('end')}
        />
        {/* Rules reference — pushes How to Play; back returns mid-game */}
        <Pressable
          onPress={() => router.push('/how-to-play')}
          style={({ pressed }) => [utilStyles.helpBtn, pressed && utilStyles.btnPressed]}
          hitSlop={6}
        >
          <Text style={utilStyles.helpText}>?</Text>
        </Pressable>
      </View>
      {/* Final fairness round banner */}
      {finalRound && (
        <View style={styles.finalBanner}>
          <Text style={styles.finalBannerText} numberOfLines={1} adjustsFontSizeToFit>
            🏁 FINAL ROUND: {finalTriggerName} hit the target · {finalRound.turnsLeft}{' '}
            {finalRound.turnsLeft === 1 ? 'turn' : 'turns'} left
          </Text>
        </View>
      )}
    </View>
  )

  // ── Phase: Chakra round ───────────────────────────────────────────────
  if (state.phase === 'chakra' && state.chakraState) {
    // Board landings: show the board (walk animation plays) and wait for the
    // player to step into the round themselves.
    if (config.boardMode && !chakraEntered) {
      return (
        <SafeAreaView style={styles.container}>
          {header}
          <View style={styles.interstitial}>
            <Chakra size={56} bgColor={CREAM} />
            <Text style={styles.landedText}>Landed on a Chakra space!</Text>
            <Text style={styles.interstitialSub}>
              One describer, every team guesses. First to get it wins.
            </Text>
          </View>
          <View style={styles.bottomSlot}>
            <Pressable
              onPress={() => setChakraEntered(true)}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.primaryBtnText}>Start Chakra Round ☸</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )
    }
    return (
      <SafeAreaView style={styles.container}>
        <ChakraRound
          chakraState={state.chakraState}
          teams={teams}
          reward={config.chakraReward}
          primaryLanguage={language}
          onSelectCard={handleSelectChakraCard}
          onTeamWon={handleChakraWinner}
          allowCancel={!config.boardMode}
          onCancel={() => dispatch({ type: 'CANCEL_CHAKRA' })}
          onEndWithoutWinner={handleConfirmChakraEnd}
          onConfirmEnd={handleConfirmChakraEnd}
        />
      </SafeAreaView>
    )
  }

  // ── Phase: between turns (interstitial splash) ────────────────────────
  if (!currentTurn) {
    return (
      <SafeAreaView style={styles.container}>
        {header}

        <View style={styles.interstitial}>
          <Text style={styles.interstitialLabel}>
            {isBonusTurn ? '☸ Chakra Bonus Round' : 'Next up'}
          </Text>
          {/* Team name in the team's own card-row band — springs in on handoff */}
          <SpringIn key={activeTeam.id} stretch>
            <View style={[styles.teamBand, { backgroundColor: activeColour }]}>
              <Text style={styles.teamBandText} numberOfLines={1} adjustsFontSizeToFit>
                {activeTeam.name}
              </Text>
            </View>
          </SpringIn>
          <Text style={styles.interstitialSub}>
            {isBonusTurn
              ? 'You earned an extra round, make it count!'
              : 'Pass the phone to your team'}
          </Text>
        </View>

        <View style={styles.bottomSlot}>
          {/* Manual chakra trigger exists only in no-board mode. On the
              board, chakra rounds fire automatically on landing on ☸. */}
          {!config.boardMode && !isBonusTurn && !finalRound && (
            <Pressable
              onPress={handleTriggerChakra}
              style={({ pressed }) => [styles.chakraBtn, pressed && styles.btnPressed]}
            >
              <Chakra bgColor="#FFFFFF" size={22} />
              <Text style={styles.chakraBtnText}>Chakra Round</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleStartTurn}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.primaryBtnText}>Start Turn →</Text>
          </Pressable>
        </View>

        {shared}
      </SafeAreaView>
    )
  }

  const { phase, activeCards, selectedCategory, timerStartedAt, correctIds, voidedIds } = currentTurn
  // Only playable cards occupy skip slots — mirrors the reducer's SKIP gate
  const playableCount = activeCards.filter(c => !voidedIds.includes(c.id)).length
  const skipsRemaining = isUnlimitedSkips(config.maxActiveCards)
    ? Infinity
    : config.maxActiveCards - playableCount
  // Applies in both modes: board turns arrive with the space's category
  // pre-set; ☸-words turns need none at all.
  const chakraWordsTurn = currentTurn.chakraWords === true
  const needsCategory =
    !chakraWordsTurn && phase === 'waiting' && selectedCategory === null

  // ── Phase: active turn ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {header}

      {/* Chakra bonus round banner */}
      {isBonusTurn && (
        <View style={styles.bonusBanner}>
          <Text style={styles.bonusBannerText}>☸ CHAKRA BONUS ROUND</Text>
        </View>
      )}

      {/* Turn label: active team chip colour + correct count + language.
          Tapping the +N pill opens the correction list (mis-tap recovery). */}
      <View style={styles.turnLabelRow}>
        <View style={[styles.turnDot, { backgroundColor: activeColour }]} />
        <Text style={styles.turnTeamLabel} numberOfLines={1}>
          {activeTeam.name}
        </Text>
        {correctIds.length > 0 && (
          <Pop trigger={correctIds.length}>
            <Pressable
              onPress={() => setShowCorrections(true)}
              style={({ pressed }) => [styles.correctPill, pressed && styles.btnPressed]}
            >
              <Text style={styles.correctCount}>+{correctIds.length} ↩</Text>
            </Pressable>
          </Pop>
        )}
        <View style={styles.turnLabelSpacer} />
        <LanguageToggle language={language} onChange={setLang} compact />
      </View>

      {/* Target reached — no-board only; the board wins at FINISH */}
      {!config.boardMode &&
        config.targetScore !== undefined &&
        activeTeam.score >= config.targetScore &&
        !finalRound && <TargetReachedBanner />}

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
        {/* ☸-words indicator for turns played from a chakra space */}
        {chakraWordsTurn && !isBonusTurn && (
          <View style={styles.chakraWordsChip}>
            <Chakra size={18} bgColor="#FFFFFF" />
            <Text style={styles.chakraWordsChipText}>Chakra words: describe the ☸ word</Text>
          </View>
        )}

        <CardStack
          cards={activeCards}
          phase={phase}
          selectedCategory={selectedCategory}
          correctIds={correctIds}
          voidedIds={voidedIds}
          skipsRemaining={skipsRemaining}
          needsCategory={needsCategory}
          chakraWords={chakraWordsTurn}
          primaryLanguage={language}
          onReveal={handleReveal}
          onCorrect={handleCorrect}
          onVoid={handleVoid}
          onSkip={handleSkip}
        />
      </ScrollView>

      {/* Category bar — below the card, above the timer. Hidden when the
          category is dictated (board space) or when the turn plays ☸ words. */}
      {!chakraWordsTurn && !(config.boardMode && currentTurn.categoryLocked) && (
        <CategoryBar
          selectedCategory={selectedCategory}
          onSelect={handleSelectCategory}
          interactive={phase === 'waiting' && !currentTurn.categoryLocked}
        />
      )}

      {/* Bottom slot: timer band while playing, End Turn button when done */}
      <View style={styles.bottomSlot}>
        {phase === 'ended' ? (
          <SpringIn>
            <Pressable
              onPress={handleConfirmTurnEnd}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.primaryBtnText}>End Turn →</Text>
            </Pressable>
          </SpringIn>
        ) : (
          <CountdownTimer
            timerStartedAt={timerStartedAt}
            durationSeconds={config.timerDuration}
            onExpired={handleTimerExpired}
          />
        )}
      </View>

      {/* This turn's corrects — tap ↩ to reverse a mis-tapped Correct */}
      <CorrectionsModal
        visible={showCorrections}
        entries={state.completedWords.filter(
          w =>
            w.round === state.turnHistory.length &&
            !w.isChakra &&
            w.teamId === currentTurn.teamId,
        )}
        onRemove={cardId => {
          dispatch({ type: 'UNDO_CORRECT', cardId })
        }}
        onClose={() => setShowCorrections(false)}
      />

      {shared}
    </SafeAreaView>
  )
}

// ── Corrections modal ───────────────────────────────────────────────────────
// Lists the words marked correct THIS turn; each can be reversed.

function CorrectionsModal({
  visible,
  entries,
  onRemove,
  onClose,
}: {
  visible: boolean
  entries: { cardId: string; word: string; wordMl?: string }[]
  onRemove: (cardId: string) => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>This Turn's Words</Text>
          <Text style={modalStyles.subtitle}>Tap ↩ to take back a mis-tapped Correct</Text>

          {entries.length === 0 ? (
            <Text style={correctionStyles.empty}>No words left this turn.</Text>
          ) : (
            entries
              .slice()
              .reverse()
              .map((e, i) => (
                <View key={`${e.cardId}-${i}`} style={correctionStyles.row}>
                  <View style={correctionStyles.words}>
                    <Text style={correctionStyles.word} numberOfLines={1}>
                      {e.word}
                    </Text>
                    {e.wordMl != null && (
                      <Text style={correctionStyles.wordMl} numberOfLines={1}>
                        {e.wordMl}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => onRemove(e.cardId)}
                    style={({ pressed }) => [
                      correctionStyles.removeBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={correctionStyles.removeBtnText}>↩</Text>
                  </Pressable>
                </View>
              ))
          )}

          <Pressable
            style={({ pressed }) => [modalStyles.btn, modalStyles.btnConfirm, pressed && styles.btnPressed]}
            onPress={onClose}
          >
            <Text style={modalStyles.btnConfirmText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

// ── SpringIn ────────────────────────────────────────────────────────────────
// Mount animation: fades in with a small spring scale — used for the team
// handoff band and the End Turn button replacing the timer. Re-keying the
// component replays it.

function SpringIn({ children, stretch = false }: { children: React.ReactNode; stretch?: boolean }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 6,
      tension: 110,
      useNativeDriver: true,
    }).start()
  }, [anim])

  return (
    <Animated.View
      style={{
        alignSelf: stretch ? 'stretch' : undefined,
        opacity: anim,
        transform: [
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  )
}

// ── Target reached banner ───────────────────────────────────────────────────
// Springs in when the active team crosses the target mid-turn: the win is
// secured, but the turn (and the fun) keeps going until the timer ends.

function TargetReachedBanner() {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start()
  }, [anim])

  return (
    <Animated.View
      style={[
        styles.targetBanner,
        {
          opacity: anim,
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
          ],
        },
      ]}
    >
      <Text style={styles.targetBannerText}>🎯 TARGET REACHED: finish the turn!</Text>
    </Animated.View>
  )
}

// ── Utility pill button ─────────────────────────────────────────────────────

function UtilityButton({
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        utilStyles.btn,
        danger && utilStyles.btnDanger,
        disabled && utilStyles.btnDisabled,
        pressed && !disabled && utilStyles.btnPressed,
      ]}
    >
      <Text style={[utilStyles.text, danger && utilStyles.textDanger]}>{label}</Text>
    </Pressable>
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
            <Pressable
              style={({ pressed }) => [modalStyles.btn, modalStyles.btnCancel, pressed && styles.btnPressed]}
              onPress={onCancel}
            >
              <Text style={modalStyles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [modalStyles.btn, modalStyles.btnConfirm, pressed && styles.btnPressed]}
              onPress={onConfirm}
            >
              <Text style={modalStyles.btnConfirmText}>Save</Text>
            </Pressable>
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
    backgroundColor: CREAM,
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    paddingTop: 8,
    gap: 10,
  },
  utilityRow: {
    flexDirection: 'row',
    gap: 8,
  },

  interstitial: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 8,
  },
  interstitialLabel: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 14,
    color: HINT,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  teamBand: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  teamBandText: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 40,
    color: '#000000',
    lineHeight: 52,
  },
  landedText: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 26,
    color: INK,
    textAlign: 'center',
    lineHeight: 36,
  },
  interstitialSub: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: HINT,
    textAlign: 'center',
  },

  bonusBanner: {
    backgroundColor: CATEGORY_COLOURS.Nature,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 8,
    alignItems: 'center',
  },
  bonusBannerText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  turnLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnLabelSpacer: {
    flex: 1,
  },
  finalBanner: {
    backgroundColor: BRAND_COLOURS.ink,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  finalBannerText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  targetBanner: {
    backgroundColor: CATEGORY_COLOURS.People,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 8,
    alignItems: 'center',
  },
  targetBannerText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: '#000000',
    letterSpacing: 0.5,
  },
  turnDot: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#000000',
  },
  turnTeamLabel: {
    flexShrink: 1,
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 22,
    color: INK,
    lineHeight: 30,
  },
  correctPill: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: CATEGORY_COLOURS.Nature,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  correctCount: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 18,
    color: CATEGORY_COLOURS.Nature,
    lineHeight: 24,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 12,
  },
  lockedCategory: {
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  chakraWordsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  chakraWordsChipText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: INK,
  },
  lockedCategoryText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: '#000000',
  },

  bottomSlot: {
    gap: 10,
    paddingBottom: 12,
  },
  primaryBtn: {
    backgroundColor: BRAND_COLOURS.orange,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7a4a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  primaryBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 19,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  chakraBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 12,
  },
  chakraBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: INK,
  },
  btnPressed: {
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
})

const utilStyles = StyleSheet.create({
  btn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnDanger: {
    borderColor: CATEGORY_COLOURS.Random,
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnPressed: {
    transform: [{ scale: 0.95 }],
  },
  text: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: INK,
  },
  textDanger: {
    color: CATEGORY_COLOURS.Random,
  },
  helpBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: CATEGORY_COLOURS.People,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: '#000000',
    lineHeight: 20,
  },
})

const correctionStyles = StyleSheet.create({
  empty: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 14,
    color: HINT,
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  words: {
    flex: 1,
  },
  word: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: INK,
  },
  wordMl: {
    fontFamily: 'BalooChettan2_500Medium',
    fontSize: 13,
    color: HINT,
    marginTop: -2,
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: CATEGORY_COLOURS.Random,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 20,
    color: CATEGORY_COLOURS.Random,
    fontWeight: '900',
  },
})

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  sheet: {
    backgroundColor: CREAM,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000000',
    padding: 24,
    width: '100%',
    maxWidth: 420,
    gap: 14,
  },
  title: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 22,
    color: INK,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: HINT,
    marginTop: -8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 26,
    color: INK,
    textAlign: 'center',
  },
  btns: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#000000',
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#FFFFFF',
  },
  btnCancelText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: INK,
  },
  btnConfirm: {
    backgroundColor: BRAND_COLOURS.orange,
  },
  btnConfirmText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
})

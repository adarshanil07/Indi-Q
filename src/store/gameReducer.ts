// =============================================================================
// store/gameReducer.ts
// Pure (GameState, GameAction) → GameState transformer.
// All deck draws happen here — callers never need to manage deck state directly.
// =============================================================================

import type {
  GameState,
  TurnState,
  TurnSummary,
  ChakraState,
  CompletedWord,
  GamePhase,
} from '../types/game'
import type { GameAction } from './gameActions'
import {
  drawCard,
  drawCardForCategory,
  drawCards,
  recordCardUsage,
  refillDeck,
} from '../utils/deck'
import { isGameOver, nextTeamIndex } from '../utils/scoring'
import { FINISH_INDEX, spaceAt } from '../constants/board'

// Refill deck from discard when empty, then return the three mutable fields.
function withFilledDeck(
  deck: GameState['deck'],
  discardPile: GameState['discardPile'],
  cardUsage: GameState['cardUsage'],
) {
  if (deck.length > 0) return { deck, discardPile, cardUsage }
  if (discardPile.length === 0) return { deck, discardPile, cardUsage }
  return refillDeck(discardPile, cardUsage)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    // ── Game lifecycle ──────────────────────────────────────────────────
    case 'START_GAME': {
      const teams = action.config.teamNames.map((name, idx) => ({
        id: `team-${idx}`,
        name,
        score: 0,
      }))
      return {
        config: action.config,
        phase: 'playing',
        teams,
        activeTeamIndex: 0,
        currentTurn: null,
        chakraState: null,
        deck: action.deck,
        discardPile: [],
        cardUsage: {},
        turnHistory: [],
        resumeTeamIndex: null,
        completedWords: [],
        finalRound: null,
        boardPositions: action.config.boardMode ? teams.map(() => 0) : [],
      }
    }

    case 'START_TURN': {
      const { deck, discardPile, cardUsage } = withFilledDeck(
        state.deck, state.discardPile, state.cardUsage,
      )
      if (deck.length === 0) return state

      const [initialCard, newDeck] = drawCard(deck)
      const team = state.teams[state.activeTeamIndex]

      // Board mode: the space the team is ON dictates the category (§8.2).
      // ☸ and FINISH spaces have none — the team chooses freely that turn.
      let boardCategory: TurnState['selectedCategory'] = null
      if (state.config.boardMode) {
        const space = spaceAt(state.boardPositions[state.activeTeamIndex] ?? 0)
        if (space.type === 'category') boardCategory = space.category
      }

      const freshTurn: TurnState = {
        teamId: team.id,
        phase: 'waiting',
        activeCards: [initialCard],
        skipsUsed: 0,
        correctIds: [],
        voidedIds: [],
        selectedCategory: boardCategory,
        categoryLocked: boardCategory !== null,
        timerStartedAt: null,
      }

      return { ...state, deck: newDeck, discardPile, cardUsage, currentTurn: freshTurn }
    }

    case 'END_GAME':
      return { ...state, phase: 'finished' }

    // ── Category & reveal ───────────────────────────────────────────────
    case 'SELECT_CATEGORY': {
      if (!state.currentTurn) return state
      // After a restart the original category is locked (no mid-turn switching)
      if (state.currentTurn.categoryLocked) return state
      return {
        ...state,
        currentTurn: { ...state.currentTurn, selectedCategory: action.category },
      }
    }

    case 'REVEAL_CARD': {
      const turn = state.currentTurn
      if (!turn || turn.phase !== 'waiting') return state
      return {
        ...state,
        currentTurn: { ...turn, phase: 'active', timerStartedAt: Date.now() },
      }
    }

    // ── During a turn ───────────────────────────────────────────────────
    case 'MARK_CORRECT': {
      const turn = state.currentTurn
      if (!turn) return state
      if (turn.voidedIds.includes(action.cardId)) return state

      const card = turn.activeCards.find(c => c.id === action.cardId)
      if (!card) return state

      const newActiveCards = turn.activeCards.filter(c => c.id !== action.cardId)
      const newCorrectIds = [...turn.correctIds, action.cardId]

      const newTeams = state.teams.map(t =>
        t.id === turn.teamId ? { ...t, score: t.score + 1 } : t,
      )

      let { deck, cardUsage } = state
      let discardPile = [...state.discardPile, card]

      // Chakra bonus turns play each card's own ☸ word — the effective
      // category comes from the card, not from a picker.
      const isBonusTurn = state.resumeTeamIndex !== null
      const effectiveCategory = isBonusTurn ? card.chakraCategory : turn.selectedCategory

      let completedWords = state.completedWords
      let usagePrev = turn.usagePrev ?? {}
      if (effectiveCategory) {
        // Snapshot this card's usage BEFORE mutating it, once per card,
        // so Undo can restore tracking exactly.
        if (!(action.cardId in usagePrev)) {
          usagePrev = { ...usagePrev, [action.cardId]: state.cardUsage[action.cardId] ?? [] }
        }
        cardUsage = recordCardUsage(cardUsage, action.cardId, effectiveCategory)
        const entry: CompletedWord = {
          cardId: card.id,
          word: card.words[effectiveCategory],
          wordMl: card.wordsMl?.[effectiveCategory],
          category: effectiveCategory,
          teamId: turn.teamId,
          round: state.turnHistory.length,
        }
        completedWords = [...completedWords, entry]
      }

      let finalActiveCards = newActiveCards

      // Draw a replacement during active play once no PLAYABLE cards remain —
      // voided cards stay stuck at the bottom and don't count.
      const playableLeft = newActiveCards.filter(
        c => !turn.voidedIds.includes(c.id),
      ).length
      if (turn.phase === 'active' && playableLeft === 0) {
        const filled = withFilledDeck(deck, discardPile, cardUsage)
        deck = filled.deck
        discardPile = filled.discardPile
        cardUsage = filled.cardUsage

        if (deck.length > 0) {
          const [newCard, remaining] = state.config.boardMode && turn.selectedCategory
            ? drawCardForCategory(deck, cardUsage, turn.selectedCategory)
            : drawCard(deck)
          deck = remaining
          // New card on top; voided cards keep their place at the bottom
          finalActiveCards = [newCard, ...newActiveCards]
        }
      }

      return {
        ...state,
        teams: newTeams,
        deck,
        discardPile,
        cardUsage,
        completedWords,
        currentTurn: {
          ...turn,
          activeCards: finalActiveCards,
          correctIds: newCorrectIds,
          usagePrev,
        },
      }
    }

    case 'VOID_CARD': {
      const turn = state.currentTurn
      if (!turn) return state
      const voidedCard = turn.activeCards.find(c => c.id === action.cardId)
      if (!voidedCard) return state
      if (turn.voidedIds.includes(action.cardId)) return state

      // The voided card sinks to the bottom of the stack (still visible,
      // stamped, unplayable) and a replacement is drawn automatically —
      // voiding is the describer's error, it shouldn't cost a skip or leave
      // the team card-less.
      let activeCards = [
        ...turn.activeCards.filter(c => c.id !== action.cardId),
        voidedCard,
      ]

      let { deck, discardPile, cardUsage } = state
      if (turn.phase === 'active') {
        const filled = withFilledDeck(deck, discardPile, cardUsage)
        deck = filled.deck
        discardPile = filled.discardPile
        cardUsage = filled.cardUsage
        if (deck.length > 0) {
          const [newCard, remaining] =
            state.config.boardMode && turn.selectedCategory
              ? drawCardForCategory(deck, cardUsage, turn.selectedCategory)
              : drawCard(deck)
          deck = remaining
          activeCards = [newCard, ...activeCards]
        }
      }

      return {
        ...state,
        deck,
        discardPile,
        cardUsage,
        currentTurn: {
          ...turn,
          activeCards,
          voidedIds: [...turn.voidedIds, action.cardId],
        },
      }
    }

    case 'SKIP': {
      const turn = state.currentTurn
      if (!turn || turn.phase !== 'active') return state
      // Only PLAYABLE cards occupy skip slots. A voided card parked at the
      // bottom is dead — it neither grants nor consumes skip capacity, so a
      // 2-skip game with one void plays on exactly like a 1-skip game.
      const playableCount = turn.activeCards.filter(
        c => !turn.voidedIds.includes(c.id),
      ).length
      if (playableCount >= state.config.maxActiveCards) return state

      const { deck, discardPile, cardUsage } = withFilledDeck(
        state.deck, state.discardPile, state.cardUsage,
      )
      if (deck.length === 0) return state

      const [newCard, newDeck] = state.config.boardMode && turn.selectedCategory
        ? drawCardForCategory(deck, cardUsage, turn.selectedCategory)
        : drawCard(deck)

      return {
        ...state,
        deck: newDeck,
        discardPile,
        cardUsage,
        currentTurn: {
          ...turn,
          activeCards: [newCard, ...turn.activeCards],
          skipsUsed: turn.skipsUsed + 1,
        },
      }
    }

    case 'UNDO_CORRECT': {
      const turn = state.currentTurn
      if (!turn) return state

      // Remove the LAST occurrence (a recycled card can be scored twice)
      const idx = turn.correctIds.lastIndexOf(action.cardId)
      if (idx === -1) return state
      const newCorrectIds = [...turn.correctIds]
      newCorrectIds.splice(idx, 1)
      const stillCorrect = newCorrectIds.includes(action.cardId)

      const newTeams = state.teams.map(t =>
        t.id === turn.teamId ? { ...t, score: Math.max(0, t.score - 1) } : t,
      )

      // Remove the matching completed-words entry (last occurrence)
      const round = state.turnHistory.length
      const newCompleted = [...state.completedWords]
      for (let i = newCompleted.length - 1; i >= 0; i--) {
        const w = newCompleted[i]
        if (
          w.cardId === action.cardId &&
          w.round === round &&
          !w.isChakra &&
          w.teamId === turn.teamId
        ) {
          newCompleted.splice(i, 1)
          break
        }
      }

      // Bring the card back into play. It normally sits in the discard pile;
      // after a mid-turn refill it may be in the deck, or already back on
      // screen (recycled) — in that last case it stays where it is.
      let deck = state.deck
      let discardPile = state.discardPile
      let activeCards = turn.activeCards
      if (!activeCards.some(c => c.id === action.cardId)) {
        const inDiscard = discardPile.find(c => c.id === action.cardId)
        const inDeck = inDiscard ? undefined : deck.find(c => c.id === action.cardId)
        if (inDiscard) {
          discardPile = discardPile.filter(c => c.id !== action.cardId)
          activeCards = [inDiscard, ...activeCards]
        } else if (inDeck) {
          deck = deck.filter(c => c.id !== action.cardId)
          activeCards = [inDeck, ...activeCards]
        }
      }

      // Restore usage tracking when no correct for this card remains
      let cardUsage = state.cardUsage
      let usagePrev = turn.usagePrev
      if (!stillCorrect && usagePrev && action.cardId in usagePrev) {
        cardUsage = { ...cardUsage }
        const prev = usagePrev[action.cardId]
        if (prev.length === 0) delete cardUsage[action.cardId]
        else cardUsage[action.cardId] = prev
        const { [action.cardId]: _omit, ...rest } = usagePrev
        usagePrev = rest
      }

      return {
        ...state,
        teams: newTeams,
        deck,
        discardPile,
        cardUsage,
        completedWords: newCompleted,
        currentTurn: { ...turn, correctIds: newCorrectIds, activeCards, usagePrev },
      }
    }

    case 'TIMER_EXPIRED': {
      const turn = state.currentTurn
      if (!turn || turn.phase !== 'active') return state
      return {
        ...state,
        currentTurn: { ...turn, phase: 'ended', timerStartedAt: null },
      }
    }

    case 'CONFIRM_TURN_END': {
      const turn = state.currentTurn
      if (!turn || turn.phase !== 'ended') return state

      // Remaining active cards (incl. voided) all go to discard — no score
      const newDiscard = [...state.discardPile, ...turn.activeCards]
      const teamIndex = state.activeTeamIndex
      const isBonusTurn = state.resumeTeamIndex !== null

      // Board mode: the piece advances one space per correct answer (§8.3)
      const oldPosition = state.boardPositions[teamIndex] ?? 0
      const newPosition = state.config.boardMode
        ? Math.min(oldPosition + turn.correctIds.length, FINISH_INDEX)
        : oldPosition
      const boardPositions = state.config.boardMode
        ? state.boardPositions.map((p, i) => (i === teamIndex ? newPosition : p))
        : state.boardPositions

      const summary: TurnSummary = {
        kind: 'turn',
        teamId: turn.teamId,
        teamIndex,
        scoreGained: turn.correctIds.length,
        cardIds: [...turn.correctIds, ...turn.activeCards.map(c => c.id)],
        finalRoundPrev: state.finalRound,
        ...(state.config.boardMode && { boardPosPrev: oldPosition }),
        ...(turn.usagePrev && Object.keys(turn.usagePrev).length > 0 && { usagePrev: turn.usagePrev }),
        ...(isBonusTurn && { resumeTeamIndex: state.resumeTeamIndex! }),
      }

      // After a Chakra bonus turn, play resumes with the stored team;
      // otherwise rotation advances as normal.
      const nextIdx = isBonusTurn
        ? state.resumeTeamIndex!
        : nextTeamIndex(teamIndex, state.teams.length)

      const updatedState: GameState = {
        ...state,
        discardPile: newDiscard,
        turnHistory: [...state.turnHistory, summary],
        activeTeamIndex: nextIdx,
        currentTurn: null,
        chakraState: null,
        resumeTeamIndex: null,
        boardPositions,
      }

      // ── End-of-game fairness (Articulate rule) ─────────────────────
      // When the target is reached (no-board) or FINISH is reached (board),
      // only the teams that have had FEWER turns this rotation cycle get one
      // final turn — everyone ends on equal turns. If the trigger team was
      // last in the rotation, every team is even and the game ends now.
      const reachedGoal = state.config.boardMode
        ? newPosition >= FINISH_INDEX
        : isGameOver(updatedState)

      let finalRound = state.finalRound
      let newPhase: GamePhase = 'playing'

      if (finalRound) {
        // Bonus turns don't consume a final-round slot
        if (!isBonusTurn) {
          finalRound = { ...finalRound, turnsLeft: finalRound.turnsLeft - 1 }
        }
        if (finalRound.turnsLeft <= 0) newPhase = 'finished'
      } else if (reachedGoal) {
        // nextIdx is the team due to play next; teams nextIdx..N-1 are the
        // ones short a turn. nextIdx === 0 means the cycle just completed.
        const turnsLeft = nextIdx === 0 ? 0 : state.teams.length - nextIdx
        if (turnsLeft > 0) {
          finalRound = { triggeredBy: turn.teamId, turnsLeft }
        } else {
          newPhase = 'finished'
        }
      }

      const result: GameState = { ...updatedState, finalRound, phase: newPhase }

      // ── Board rule: LANDING on a ☸ space fires a Chakra round instantly,
      // no choice. The landing team runs it (rotation is held, then advances
      // at CONFIRM_CHAKRA_END as usual). Only an actual move lands — sitting
      // on ☸ across turns does not re-trigger. Bonus turns are exempt (their
      // rotation bookkeeping must resume exactly).
      const landedOnChakra =
        state.config.boardMode &&
        !isBonusTurn &&
        turn.correctIds.length > 0 &&
        spaceAt(newPosition).type === 'chakra'

      if (landedOnChakra && newPhase === 'playing') {
        const withLandingTeam = { ...result, activeTeamIndex: teamIndex }
        const triggered = gameReducer(withLandingTeam, { type: 'TRIGGER_CHAKRA' })
        // If the deck couldn't supply chakra cards, fall back to normal flow
        if (triggered.phase === 'chakra') return triggered
      }

      return result
    }

    case 'RESTART_TURN': {
      const turn = state.currentTurn
      if (!turn) return state

      // Cards on screen go to discard; a fresh card is drawn with a full timer.
      const { deck, discardPile, cardUsage } = withFilledDeck(
        state.deck,
        [...state.discardPile, ...turn.activeCards],
        state.cardUsage,
      )
      if (deck.length === 0) return state

      const [freshCard, newDeck] = drawCard(deck)

      // The physical game does not allow switching category mid-turn, so a
      // restart keeps the category that was already chosen and locks it.
      return {
        ...state,
        deck: newDeck,
        discardPile,
        cardUsage,
        currentTurn: {
          ...turn,
          phase: 'waiting',
          activeCards: [freshCard],
          skipsUsed: 0,
          voidedIds: [],
          selectedCategory: turn.selectedCategory,
          categoryLocked: turn.selectedCategory !== null,
          timerStartedAt: null,
        },
      }
    }

    // ── Undo ─────────────────────────────────────────────────────────────
    case 'UNDO': {
      if (state.turnHistory.length === 0) return state

      const last = state.turnHistory[state.turnHistory.length - 1]
      const isChakraUndo = last.kind === 'chakra'

      const newTeams = state.teams.map(t =>
        t.id === last.teamId
          ? { ...t, score: Math.max(0, t.score - last.scoreGained) }
          : t,
      )

      // Pull the round's cards back out of discard into the deck
      const undoneIds = new Set(last.cardIds)
      const newDiscard = state.discardPile.filter(c => !undoneIds.has(c.id))
      const restored = state.discardPile.filter(c => undoneIds.has(c.id))

      // Strip the undone round's entries from the completed-words log.
      // Entries record the history length at the time they were scored, which
      // equals the index their round's summary ends up at — so the last
      // summary's entries are exactly those with round === history.length-1
      // and a matching isChakra flag.
      const undoneRound = state.turnHistory.length - 1
      const newCompletedWords = state.completedWords.filter(w => {
        if (isChakraUndo) {
          return !(w.isChakra && w.round === undoneRound && w.teamId === last.teamId)
        }
        return !(w.round === undoneRound && !w.isChakra && w.teamId === last.teamId)
      })

      // Restore usage tracking for the undone turn's words
      let cardUsage = state.cardUsage
      if (last.usagePrev) {
        cardUsage = { ...cardUsage }
        for (const [cardId, prev] of Object.entries(last.usagePrev)) {
          if (prev.length === 0) delete cardUsage[cardId]
          else cardUsage[cardId] = prev
        }
      }

      // Board mode: put the moved piece back where it was
      let boardPositions = state.boardPositions
      if (last.boardPosPrev !== undefined) {
        const movedIdx = isChakraUndo
          ? state.teams.findIndex(t => t.id === last.teamId)
          : last.teamIndex
        if (movedIdx >= 0) {
          boardPositions = boardPositions.map((p, i) =>
            i === movedIdx ? last.boardPosPrev! : p,
          )
        }
      }

      return {
        ...state,
        boardPositions,
        teams: newTeams,
        deck: [...restored, ...state.deck],
        discardPile: newDiscard,
        cardUsage,
        currentTurn: null,
        activeTeamIndex: last.teamIndex,
        turnHistory: state.turnHistory.slice(0, -1),
        phase: 'playing',
        completedWords: newCompletedWords,
        finalRound: last.finalRoundPrev ?? null,
        // Undoing a chakra round cancels any queued bonus turn; undoing a
        // bonus turn restores its resume bookkeeping.
        resumeTeamIndex: isChakraUndo ? null : (last.resumeTeamIndex ?? null),
      }
    }

    // ── Manual overrides ─────────────────────────────────────────────────
    case 'SET_TEAM_SCORE':
      return {
        ...state,
        teams: state.teams.map(t =>
          t.id === action.teamId ? { ...t, score: Math.max(0, action.score) } : t,
        ),
      }

    // ── Chakra Mode ───────────────────────────────────────────────────────
    case 'TRIGGER_CHAKRA': {
      const needed = state.config.chakraCardCount
      let { deck, discardPile, cardUsage } = state

      // Ensure there are enough cards — may require multiple refills
      while (deck.length < needed && discardPile.length > 0) {
        const refilled = refillDeck(discardPile, cardUsage)
        deck = [...deck, ...refilled.deck]
        discardPile = refilled.discardPile
        cardUsage = refilled.cardUsage
      }

      const available = Math.min(needed, deck.length)
      if (available === 0) return state

      const [chakraCards, newDeck] = drawCards(deck, available)

      const chakraState: ChakraState = {
        phase: 'selecting',
        cards: chakraCards,
        selectedCard: null,
        winningTeamId: null,
      }

      return { ...state, phase: 'chakra', deck: newDeck, discardPile, cardUsage, chakraState }
    }

    case 'CANCEL_CHAKRA': {
      // Only before a card is chosen — an accidental trigger costs nothing.
      if (!state.chakraState || state.chakraState.phase !== 'selecting') return state
      return {
        ...state,
        phase: 'playing',
        chakraState: null,
        // Offered cards go to the BOTTOM of the deck (the describer saw them)
        deck: [...state.deck, ...state.chakraState.cards],
      }
    }

    case 'SELECT_CHAKRA_CARD': {
      if (!state.chakraState || state.chakraState.phase !== 'selecting') return state
      return {
        ...state,
        chakraState: { ...state.chakraState, phase: 'active', selectedCard: action.card },
      }
    }

    case 'CHAKRA_CORRECT': {
      if (!state.chakraState || state.chakraState.phase !== 'active') return state

      // Numeric reward: points in no-board mode, board spaces in board mode
      // (applied at CONFIRM_CHAKRA_END). 'extra-round' queues a bonus turn.
      const reward = state.config.chakraReward
      const newTeams =
        typeof reward === 'number' && !state.config.boardMode
          ? state.teams.map(t =>
              t.id === action.winningTeamId ? { ...t, score: t.score + reward } : t,
            )
          : state.teams

      // Log the guessed Chakra word for the Completed Words screen
      const sel = state.chakraState.selectedCard
      const completedWords = sel
        ? [
            ...state.completedWords,
            {
              cardId: sel.id,
              word: sel.words[sel.chakraCategory],
              wordMl: sel.wordsMl?.[sel.chakraCategory],
              category: sel.chakraCategory,
              teamId: action.winningTeamId,
              round: state.turnHistory.length,
              isChakra: true,
            },
          ]
        : state.completedWords

      return {
        ...state,
        teams: newTeams,
        completedWords,
        chakraState: { ...state.chakraState, phase: 'ended', winningTeamId: action.winningTeamId },
      }
    }

    case 'CONFIRM_CHAKRA_END': {
      if (!state.chakraState) return state

      const { winningTeamId, cards: chakraCards } = state.chakraState
      const discardPile = [...state.discardPile, ...chakraCards]

      // The Chakra round replaced the active team's turn, so rotation advances.
      const nextIdx = nextTeamIndex(state.activeTeamIndex, state.teams.length)

      // Extra-round reward: the winner plays a bonus turn first, then play
      // resumes with the team that was up next.
      const winnerIdx =
        state.config.chakraReward === 'extra-round' && winningTeamId
          ? state.teams.findIndex(t => t.id === winningTeamId)
          : -1

      // Board mode: a numeric reward moves the winner forward that many spaces
      const winnerTeamIdx = winningTeamId
        ? state.teams.findIndex(t => t.id === winningTeamId)
        : -1
      const numericReward =
        typeof state.config.chakraReward === 'number' ? state.config.chakraReward : 0
      const winnerOldPos =
        winnerTeamIdx >= 0 ? state.boardPositions[winnerTeamIdx] ?? 0 : 0
      const winnerNewPos =
        state.config.boardMode && winnerTeamIdx >= 0
          ? Math.min(winnerOldPos + numericReward, FINISH_INDEX)
          : winnerOldPos
      const boardPositions =
        state.config.boardMode && winnerTeamIdx >= 0
          ? state.boardPositions.map((p, i) => (i === winnerTeamIdx ? winnerNewPos : p))
          : state.boardPositions

      // Record the round so Undo can reverse it (mis-tapped winning team).
      const summary: TurnSummary = {
        kind: 'chakra',
        teamId: winningTeamId ?? '',
        teamIndex: state.activeTeamIndex,
        scoreGained:
          winningTeamId && typeof state.config.chakraReward === 'number' && !state.config.boardMode
            ? state.config.chakraReward
            : 0,
        cardIds: chakraCards.map(c => c.id),
        finalRoundPrev: state.finalRound,
        ...(state.config.boardMode && winnerTeamIdx >= 0 && { boardPosPrev: winnerOldPos }),
      }

      const updatedState: GameState = {
        ...state,
        chakraState: null,
        discardPile,
        turnHistory: [...state.turnHistory, summary],
        activeTeamIndex: winnerIdx >= 0 ? winnerIdx : nextIdx,
        resumeTeamIndex: winnerIdx >= 0 ? nextIdx : null,
        boardPositions,
      }

      // The reward may have pushed the winner past the goal (target score or
      // FINISH space) — that triggers the fairness round, not an instant end.
      // Only the teams still owed a turn this cycle (nextIdx..N-1) play on;
      // nextIdx === 0 means the cycle just completed → finish immediately.
      const reachedGoal = state.config.boardMode
        ? winnerNewPos >= FINISH_INDEX && winnerTeamIdx >= 0
        : isGameOver(updatedState)

      let finalRound = state.finalRound
      let newPhase: GamePhase = 'playing'
      if (!finalRound && reachedGoal) {
        const turnsLeft = nextIdx === 0 ? 0 : state.teams.length - nextIdx
        if (turnsLeft > 0 && winningTeamId) {
          finalRound = { triggeredBy: winningTeamId, turnsLeft }
        } else {
          newPhase = 'finished'
        }
      }

      return { ...updatedState, finalRound, phase: newPhase }
    }

    default:
      return state
  }
}

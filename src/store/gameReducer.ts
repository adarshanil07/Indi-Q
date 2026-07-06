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
      }
    }

    case 'START_TURN': {
      const { deck, discardPile, cardUsage } = withFilledDeck(
        state.deck, state.discardPile, state.cardUsage,
      )
      if (deck.length === 0) return state

      const [initialCard, newDeck] = drawCard(deck)
      const team = state.teams[state.activeTeamIndex]

      const freshTurn: TurnState = {
        teamId: team.id,
        phase: 'waiting',
        activeCards: [initialCard],
        skipsUsed: 0,
        correctIds: [],
        voidedIds: [],
        selectedCategory: null,
        timerStartedAt: null,
      }

      return { ...state, deck: newDeck, discardPile, cardUsage, currentTurn: freshTurn }
    }

    case 'END_GAME':
      return { ...state, phase: 'finished' }

    // ── Category & reveal ───────────────────────────────────────────────
    case 'SELECT_CATEGORY': {
      if (!state.currentTurn) return state
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

      let completedWords = state.completedWords
      if (turn.selectedCategory) {
        cardUsage = recordCardUsage(cardUsage, action.cardId, turn.selectedCategory)
        const entry: CompletedWord = {
          cardId: card.id,
          word: card.words[turn.selectedCategory],
          wordMl: card.wordsMl?.[turn.selectedCategory],
          category: turn.selectedCategory,
          teamId: turn.teamId,
          round: state.turnHistory.length,
        }
        completedWords = [...completedWords, entry]
      }

      let finalActiveCards = newActiveCards

      // Only draw a new card during active play — not in the ended phase
      if (turn.phase === 'active' && newActiveCards.length === 0) {
        const filled = withFilledDeck(deck, discardPile, cardUsage)
        deck = filled.deck
        discardPile = filled.discardPile
        cardUsage = filled.cardUsage

        if (deck.length > 0) {
          const [newCard, remaining] = state.config.boardMode && turn.selectedCategory
            ? drawCardForCategory(deck, cardUsage, turn.selectedCategory)
            : drawCard(deck)
          deck = remaining
          finalActiveCards = [newCard]
        }
      }

      return {
        ...state,
        teams: newTeams,
        deck,
        discardPile,
        cardUsage,
        completedWords,
        currentTurn: { ...turn, activeCards: finalActiveCards, correctIds: newCorrectIds },
      }
    }

    case 'VOID_CARD': {
      const turn = state.currentTurn
      if (!turn) return state
      if (!turn.activeCards.find(c => c.id === action.cardId)) return state
      if (turn.voidedIds.includes(action.cardId)) return state
      return {
        ...state,
        currentTurn: { ...turn, voidedIds: [...turn.voidedIds, action.cardId] },
      }
    }

    case 'SKIP': {
      const turn = state.currentTurn
      if (!turn || turn.phase !== 'active') return state
      if (turn.activeCards.length >= state.config.maxActiveCards) return state

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

      const summary: TurnSummary = {
        teamId: turn.teamId,
        teamIndex,
        scoreGained: turn.correctIds.length,
        cardIds: [...turn.correctIds, ...turn.activeCards.map(c => c.id)],
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
      }

      const newPhase: GamePhase = isGameOver(updatedState) ? 'finished' : 'playing'
      return { ...updatedState, phase: newPhase }
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
          selectedCategory: null,
          timerStartedAt: null,
        },
      }
    }

    // ── Undo ─────────────────────────────────────────────────────────────
    case 'UNDO': {
      if (state.turnHistory.length === 0) return state

      const last = state.turnHistory[state.turnHistory.length - 1]

      const newTeams = state.teams.map(t =>
        t.id === last.teamId
          ? { ...t, score: Math.max(0, t.score - last.scoreGained) }
          : t,
      )

      // Pull the turn's cards back out of discard into the deck
      const undoneIds = new Set(last.cardIds)
      const newDiscard = state.discardPile.filter(c => !undoneIds.has(c.id))
      const restored = state.discardPile.filter(c => undoneIds.has(c.id))

      // Strip the undone turn's entries from the completed-words log.
      // The undone turn's round index is turnHistory.length - 1; Chakra-round
      // entries sharing that round number belong to a separate Chakra round
      // and are kept.
      const undoneRound = state.turnHistory.length - 1
      const newCompletedWords = state.completedWords.filter(
        w => !(w.round === undoneRound && !w.isChakra && w.teamId === last.teamId),
      )

      return {
        ...state,
        teams: newTeams,
        deck: [...restored, ...state.deck],
        discardPile: newDiscard,
        currentTurn: null,
        activeTeamIndex: last.teamIndex,
        turnHistory: state.turnHistory.slice(0, -1),
        phase: 'playing',
        completedWords: newCompletedWords,
        // If the undone turn was a Chakra bonus turn, restore its bookkeeping
        // so re-playing it still resumes rotation with the right team.
        resumeTeamIndex: last.resumeTeamIndex ?? null,
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

    case 'SELECT_CHAKRA_CARD': {
      if (!state.chakraState || state.chakraState.phase !== 'selecting') return state
      return {
        ...state,
        chakraState: { ...state.chakraState, phase: 'active', selectedCard: action.card },
      }
    }

    case 'CHAKRA_CORRECT': {
      if (!state.chakraState || state.chakraState.phase !== 'active') return state

      // Points reward is applied immediately; 'extra-round' is handled at
      // CONFIRM_CHAKRA_END by queueing a bonus turn for the winner.
      const reward = state.config.chakraReward
      const newTeams =
        typeof reward === 'number'
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

      const { winningTeamId } = state.chakraState
      const discardPile = [...state.discardPile, ...state.chakraState.cards]

      // The Chakra round replaced the active team's turn, so rotation advances.
      const nextIdx = nextTeamIndex(state.activeTeamIndex, state.teams.length)

      // Extra-round reward: the winner plays a bonus turn first, then play
      // resumes with the team that was up next.
      const winnerIdx =
        state.config.chakraReward === 'extra-round' && winningTeamId
          ? state.teams.findIndex(t => t.id === winningTeamId)
          : -1

      const updatedState: GameState = {
        ...state,
        chakraState: null,
        discardPile,
        activeTeamIndex: winnerIdx >= 0 ? winnerIdx : nextIdx,
        resumeTeamIndex: winnerIdx >= 0 ? nextIdx : null,
      }

      // A points reward may have pushed the winner past the target score.
      const newPhase: GamePhase = isGameOver(updatedState) ? 'finished' : 'playing'
      return { ...updatedState, phase: newPhase }
    }

    default:
      return state
  }
}

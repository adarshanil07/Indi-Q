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
  isFreshFor,
  recordCardUsage,
  takeCard,
  takeCards,
  type Need,
} from '../utils/deck'
import { isGameOver, nextTeamIndex } from '../utils/scoring'
import { FINISH_INDEX, spaceAt } from '../constants/board'

/**
 * What the current turn's next card must provide: the card's own ☸ word on
 * chakra-words turns, the selected category once one is chosen, otherwise
 * anything (score mode before the category is picked).
 */
function turnNeed(turn: Pick<TurnState, 'chakraWords' | 'selectedCategory'>): Need {
  if (turn.chakraWords) return { kind: 'chakra' }
  if (turn.selectedCategory) return { kind: 'category', category: turn.selectedCategory }
  return { kind: 'any' }
}

/** Ids of every card on screen — pool selection must never duplicate them. */
function onScreenIds(cards: readonly { id: string }[]): Set<string> {
  return new Set(cards.map(c => c.id))
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
      const team = state.teams[state.activeTeamIndex]

      // Board mode: the space the team is ON dictates the category (§8.2).
      // Sitting on a ☸ space means the turn plays each card's ☸ word instead
      // of a category — the same rule chakra BONUS turns always follow.
      const isBonus = state.resumeTeamIndex !== null
      let boardCategory: TurnState['selectedCategory'] = null
      let chakraWords = isBonus
      if (state.config.boardMode && !isBonus) {
        const space = spaceAt(state.boardPositions[state.activeTeamIndex] ?? 0)
        if (space.type === 'category') boardCategory = space.category
        else if (space.type === 'chakra') chakraWords = true
      }

      // The need is known before the draw whenever the category is dictated
      // (board spaces, ☸-words turns), so the OPENING card is word-fresh too —
      // previously only mid-turn replacements were category-aware.
      const need = turnNeed({ chakraWords, selectedCategory: boardCategory })
      const taken = takeCard(state.deck, state.discardPile, state.cardUsage, need)
      if (!taken) return state

      const freshTurn: TurnState = {
        teamId: team.id,
        phase: 'waiting',
        activeCards: [taken.card],
        skipsUsed: 0,
        correctIds: [],
        voidedIds: [],
        selectedCategory: boardCategory,
        categoryLocked: boardCategory !== null || chakraWords,
        chakraWords,
        timerStartedAt: null,
      }

      return {
        ...state,
        deck: taken.deck,
        discardPile: taken.discardPile,
        currentTurn: freshTurn,
      }
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

      // Score edition: the category is chosen while the opening card is still
      // face-down, so the card can be re-resolved now that the need is known.
      // If its word for the chosen category is already spent and a fresh card
      // exists, swap silently — every card back looks identical, so nothing
      // visible changes. Board and ☸-words turns drew need-aware at START_TURN
      // and pass straight through here.
      let { deck, discardPile } = state
      let activeCards = turn.activeCards
      const need = turnNeed(turn)
      const top = activeCards[0]
      if (
        need.kind === 'category' &&
        activeCards.length === 1 &&
        top !== undefined &&
        !isFreshFor(top, need, state.cardUsage)
      ) {
        const swap = takeCard(deck, discardPile, state.cardUsage, need, new Set([top.id]))
        if (swap && swap.fresh) {
          // The face-down card was never seen, so it returns to the deck front
          // rather than the discard pile.
          deck = [top, ...swap.deck]
          discardPile = swap.discardPile
          activeCards = [swap.card]
        }
      }

      return {
        ...state,
        deck,
        discardPile,
        currentTurn: { ...turn, activeCards, phase: 'active', timerStartedAt: Date.now() },
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

      // Chakra-words turns (bonus turns, or sitting on a ☸ space) play each
      // card's own ☸ word — the effective category comes from the card.
      const effectiveCategory = turn.chakraWords ? card.chakraCategory : turn.selectedCategory

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
      // voided cards stay stuck at the bottom and don't count. The just-scored
      // card is already in the discard pile here, so it is a legitimate
      // candidate for a future need — but never for this one, since the word
      // it just spent is recorded.
      const playableLeft = newActiveCards.filter(
        c => !turn.voidedIds.includes(c.id),
      ).length
      if (turn.phase === 'active' && playableLeft === 0) {
        const taken = takeCard(
          deck, discardPile, cardUsage, turnNeed(turn), onScreenIds(newActiveCards),
        )
        if (taken) {
          deck = taken.deck
          discardPile = taken.discardPile
          // New card on top; voided cards keep their place at the bottom
          finalActiveCards = [taken.card, ...newActiveCards]
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

      // The describer said the word aloud, so everyone heard it: burn it.
      // Snapshotted into usagePrev first, exactly like MARK_CORRECT, so
      // undoing the turn restores the word.
      let { deck, discardPile, cardUsage } = state
      let usagePrev = turn.usagePrev ?? {}
      const spokenCategory = turn.chakraWords
        ? voidedCard.chakraCategory
        : turn.selectedCategory
      if (spokenCategory) {
        if (!(action.cardId in usagePrev)) {
          usagePrev = { ...usagePrev, [action.cardId]: state.cardUsage[action.cardId] ?? [] }
        }
        cardUsage = recordCardUsage(cardUsage, action.cardId, spokenCategory)
      }

      if (turn.phase === 'active') {
        const taken = takeCard(
          deck, discardPile, cardUsage, turnNeed(turn), onScreenIds(activeCards),
        )
        if (taken) {
          deck = taken.deck
          discardPile = taken.discardPile
          activeCards = [taken.card, ...activeCards]
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
          usagePrev,
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

      const taken = takeCard(
        state.deck,
        state.discardPile,
        state.cardUsage,
        turnNeed(turn),
        onScreenIds(turn.activeCards),
      )
      if (!taken) return state

      return {
        ...state,
        deck: taken.deck,
        discardPile: taken.discardPile,
        currentTurn: {
          ...turn,
          activeCards: [taken.card, ...turn.activeCards],
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

      // Cards on screen go to discard; a fresh card is drawn with a full
      // timer. The just-abandoned cards are excluded so a false start never
      // deals the same card straight back — unless literally nothing else
      // remains, in which case the exclusion is dropped rather than stalling.
      const discardAll = [...state.discardPile, ...turn.activeCards]
      const taken =
        takeCard(
          state.deck, discardAll, state.cardUsage,
          turnNeed(turn), onScreenIds(turn.activeCards),
        ) ?? takeCard(state.deck, discardAll, state.cardUsage, turnNeed(turn))
      if (!taken) return state

      // The physical game does not allow switching category mid-turn, so a
      // restart keeps the category that was already chosen and locks it.
      return {
        ...state,
        deck: taken.deck,
        discardPile: taken.discardPile,
        currentTurn: {
          ...turn,
          phase: 'waiting',
          activeCards: [taken.card],
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
      // Candidates must have a FRESH ☸ word — previously this took the top of
      // the deck blind, so the describer could be offered a card whose ☸ word
      // had already been played. Fresh-☸ cards fill the hand first;
      // least-recently-seen repeats pad the remainder so the round always
      // offers a full hand.
      const { cards, deck, discardPile } = takeCards(
        state.deck,
        state.discardPile,
        state.cardUsage,
        { kind: 'chakra' },
        state.config.chakraCardCount,
      )
      if (cards.length === 0) return state

      const chakraState: ChakraState = {
        phase: 'selecting',
        cards,
        selectedCard: null,
        winningTeamId: null,
      }

      return { ...state, phase: 'chakra', deck, discardPile, chakraState }
    }

    case 'CANCEL_CHAKRA': {
      // Only before a card is chosen — an accidental trigger costs nothing.
      if (!state.chakraState || state.chakraState.phase !== 'selecting') return state
      return {
        ...state,
        phase: 'playing',
        chakraState: null,
        // The describer saw the offered cards, so they count as recently seen:
        // back of the discard pile, not the deck (which holds only unseen
        // cards). Their words were never spoken, so they stay fully fresh.
        discardPile: [...state.discardPile, ...state.chakraState.cards],
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

      const { winningTeamId, cards: chakraCards, selectedCard } = state.chakraState
      const discardPile = [...state.discardPile, ...chakraCards]

      // The chosen card's ☸ word was described to the whole room, so it is
      // spent whether or not anyone guessed it. Snapshot the card's previous
      // usage into the summary so UNDO restores it. Previously nothing was
      // recorded here at all, and a guessed ☸ word could reappear later.
      let cardUsage = state.cardUsage
      let chakraUsagePrev: Record<string, typeof cardUsage[string]> | undefined
      if (selectedCard) {
        chakraUsagePrev = { [selectedCard.id]: state.cardUsage[selectedCard.id] ?? [] }
        cardUsage = recordCardUsage(cardUsage, selectedCard.id, selectedCard.chakraCategory)
      }

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
        ...(chakraUsagePrev && { usagePrev: chakraUsagePrev }),
        ...(state.config.boardMode && winnerTeamIdx >= 0 && { boardPosPrev: winnerOldPos }),
      }

      const updatedState: GameState = {
        ...state,
        chakraState: null,
        discardPile,
        cardUsage,
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

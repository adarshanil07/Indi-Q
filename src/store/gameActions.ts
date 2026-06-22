// =============================================================================
// store/gameActions.ts
// Every action that can change game state, as a discriminated union type.
// =============================================================================

import type { Card, Category, GameConfig } from '../types/game'

export type GameAction =
  // ── Game lifecycle ──────────────────────────────────────────────────────
  | {
      type: 'START_GAME'
      config: GameConfig
      deck: Card[]           // pre-shuffled full deck
    }
  | {
      type: 'START_TURN'
    }
  | {
      type: 'END_GAME'
    }

  // ── Category selection ─────────────────────────────────────────────────
  | {
      type: 'SELECT_CATEGORY'
      category: Category
    }

  // ── Card reveal ────────────────────────────────────────────────────────
  | {
      type: 'REVEAL_CARD'
    }

  // ── During a turn ──────────────────────────────────────────────────────
  | {
      /**
       * Team guesses correctly. Removes the card from activeCards,
       * adds its ID to correctIds, and increments the team's score.
       */
      type: 'MARK_CORRECT'
      cardId: string
    }
  | {
      /**
       * Describer accidentally said the word. Card is darkened and cannot
       * be scored, but remains visible on screen.
       */
      type: 'VOID_CARD'
      cardId: string
    }
  | {
      /**
       * Describer taps Skip. Reducer draws the next card from state.deck
       * and pushes it to the top of activeCards.
       */
      type: 'SKIP'
    }
  | {
      type: 'TIMER_EXPIRED'
    }
  | {
      type: 'CONFIRM_TURN_END'
    }

  // ── Undo ───────────────────────────────────────────────────────────────
  | {
      type: 'UNDO'
    }

  // ── Manual override ────────────────────────────────────────────────────
  | {
      /** Manually set a team's score (Section 6.7). */
      type: 'SET_TEAM_SCORE'
      teamId: string
      score: number
    }

  // ── Chakra Mode ────────────────────────────────────────────────────────
  | {
      /**
       * Triggers Chakra Mode. Reducer draws config.chakraCardCount cards
       * from state.deck and transitions phase → 'chakra'.
       */
      type: 'TRIGGER_CHAKRA'
    }
  | {
      type: 'SELECT_CHAKRA_CARD'
      card: Card
    }
  | {
      type: 'CHAKRA_CORRECT'
      winningTeamId: string
    }
  | {
      type: 'CONFIRM_CHAKRA_END'
    }

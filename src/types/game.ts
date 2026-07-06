// =============================================================================
// types/game.ts
// Core game state types for Indi-Q.
//
// Design principles:
//   - No magic strings: every category, phase, and mode is a union type.
//     If you mistype 'Peple' instead of 'People', TypeScript catches it.
//   - No hardcoded values: all rule-governing numbers (timer, skips, etc.)
//     live in GameConfig, which is set once at setup and never mutated.
//   - Board mode is optional on GameState. In no-board mode, boardState is
//     simply undefined. When the board overlay is built, BoardState is defined
//     in its own file and slotted into GameState — nothing below changes.
// =============================================================================


// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------

/**
 * The six word categories on every Indi-Q card.
 * Using a union type means TypeScript will catch any typo at compile time.
 */
export type Category = 'People' | 'Location' | 'Object' | 'Movie' | 'Nature' | 'Random'

// CATEGORIES array and CATEGORY_COLOURS have moved to constants/categories.ts.
// Import them from there. Only the Category *type* lives here.


// -----------------------------------------------------------------------------
// Card  (Section 6.1)
// -----------------------------------------------------------------------------

/**
 * A single game card.
 *
 * `words` holds one word or phrase per category (e.g. words.People = "Mohanlal").
 *
 * `chakraCategory` marks which category's word doubles as the Chakra word
 * for this card. Outside Chakra Mode it behaves identically to any other
 * category word — the distinction only matters when ChakraState is active.
 */
export interface Card {
  id: string
  words: Record<Category, string>

  /**
   * Malayalam-script version of each word, shown as small grey text
   * alongside the transliteration. Optional — older card data may lack it.
   */
  wordsMl?: Record<Category, string>

  chakraCategory: Category
}

/**
 * A word that was successfully guessed at some point in the session.
 * Powers the Completed Words screen — who scored what, in which category.
 */
export interface CompletedWord {
  cardId: string
  word: string
  wordMl?: string
  category: Category
  teamId: string

  /**
   * Which round this word was guessed in — the value of turnHistory.length
   * at the time. Together with teamId/isChakra this groups words by round
   * on the Completed Words screen.
   */
  round: number

  /** True when the word was guessed in a Chakra round, not a normal turn. */
  isChakra?: boolean
}


// -----------------------------------------------------------------------------
// Game Configuration  (Section 5)
// -----------------------------------------------------------------------------

/**
 * What the winning team receives after a Chakra round (Section 7).
 *
 * 1 | 2 | 3      → the winner's score increases by that many points
 *                  (the no-board equivalent of moving N places ahead).
 * 'extra-round'  → the winning team immediately plays a bonus turn
 *                  before play resumes with the normal team order.
 */
export type ChakraReward = 1 | 2 | 3 | 'extra-round'

/**
 * Set once during Game Setup and fixed for the entire session.
 * All rule behaviour should derive from this object — never from hardcoded
 * constants buried in components or reducers.
 */
export interface GameConfig {
  /** Display names for each team, in turn order. */
  teamNames: string[]

  /** How long each turn lasts in seconds. */
  timerDuration: number

  /**
   * Maximum number of cards visible on screen at the same time.
   * This is what the player configures as "number of skips" in Setup.
   * The Skip button is shown while activeCards.length < maxActiveCards.
   * At the limit, the button hides — the player must complete or wait.
   */
  maxActiveCards: number

  /**
   * How many cards are shown to the describer when Chakra Mode activates.
   * The describer picks one; they describe that card's Chakra word.
   */
  chakraCardCount: number

  /** What the winning team receives after a Chakra round. */
  chakraReward: ChakraReward

  /** Whether the digital board overlay is enabled for this session. */
  boardMode: boolean

  /**
   * No-board mode only.
   * The score a team must reach to win.
   * If undefined, there is no automatic win condition — players end manually.
   */
  targetScore?: number
}


// -----------------------------------------------------------------------------
// Team
// -----------------------------------------------------------------------------

export interface Team {
  id: string
  name: string

  /** Running count of correctly answered cards across the whole game. */
  score: number

  // NOTE: boardPosition will be added to BoardState (Section 8), not here.
  // Keeping board data separate ensures Team stays clean for no-board mode.
}


// -----------------------------------------------------------------------------
// Turn  (Sections 6.2 – 6.5)
// -----------------------------------------------------------------------------

/**
 * The phase a turn is currently in.
 *
 * 'waiting' — Card is blurred. The category has not been selected yet
 *             (selectedCategory === null), or has been selected but the
 *             card hasn't been tapped to reveal (selectedCategory !== null).
 *             The timer has NOT started.
 *
 * 'active'  — Card revealed, timer running, guessing in progress.
 *
 * 'ended'   — Timer has hit zero. Cards are re-blurred. The active player
 *             manually confirms the end of the round before passing the phone.
 */
export type TurnPhase = 'waiting' | 'active' | 'ended'

/**
 * The full live state of the current team's turn.
 * Created fresh at the start of each turn; discarded (after being summarised)
 * when the turn ends.
 */
export interface TurnState {
  /** Which team is currently describing. */
  teamId: string

  phase: TurnPhase

  /**
   * The stack of cards currently visible on screen.
   * Index 0 = the active card (newest, shown at the top).
   * Higher indices = previously skipped cards, still completable.
   *
   * When a player skips:  a new Card is unshifted to the front.
   * When a card is correct: it is filtered out of this array.
   * The Skip button shows while activeCards.length < config.maxActiveCards.
   */
  activeCards: Card[]

  /** Number of times Skip has been pressed this turn. */
  skipsUsed: number

  /** IDs of cards marked correct this turn. Used to score and to fill TurnSummary. */
  correctIds: string[]

  /**
   * IDs of cards voided this turn (describer accidentally said the word).
   * Voided cards stay visible on screen but are darkened and cannot be scored.
   */
  voidedIds: string[]

  /**
   * The category being described this turn.
   *
   * null       → not yet chosen (player still selecting in no-board mode).
   * Category   → locked in (chosen by player, or set from board position).
   *
   * The mechanism that sets this differs between modes, but the shape is
   * identical — TurnState doesn't need to know which mode it's in.
   */
  selectedCategory: Category | null

  /**
   * Timestamp (ms) when the card was revealed and the timer started.
   * null when phase is 'waiting' or 'ended'.
   * Use (Date.now() - timerStartedAt) to compute elapsed time.
   */
  timerStartedAt: number | null
}


// -----------------------------------------------------------------------------
// Turn Summary  (Section 6.6 – Undo)
// -----------------------------------------------------------------------------

/**
 * A compact record of what happened in a completed turn.
 * The last entry in GameState.turnHistory is what Undo reverses.
 *
 * Storing a summary (not a full GameState snapshot) keeps memory lean
 * while still providing everything needed to reverse a turn:
 *   - Subtract scoreGained from the team's score.
 *   - Return cardIds to the deck.
 *   - Restore activeTeamIndex to teamIndex.
 */
export interface TurnSummary {
  teamId: string

  /** The index in GameState.teams[] of the team who played this turn.
   *  Used to restore activeTeamIndex when undoing. */
  teamIndex: number

  /** How many correct answers were logged. Subtracted from team.score on undo. */
  scoreGained: number

  /**
   * Every card ID that was in play this turn (correct, skipped, or unanswered).
   * Returned to the top of the deck on undo so the game state is fully restored.
   */
  cardIds: string[]

  /**
   * Set when this turn was a Chakra bonus turn (reward = 'extra-round').
   * Holds the team index play resumed with afterwards, so Undo can restore
   * GameState.resumeTeamIndex correctly.
   */
  resumeTeamIndex?: number
}


// -----------------------------------------------------------------------------
// Chakra Mode  (Section 7)
// -----------------------------------------------------------------------------

/**
 * 'selecting' → Describer is choosing one card from the presented set.
 * 'active'    → Card chosen; describer explains the Chakra word to all teams.
 * 'ended'     → A team guessed correctly; waiting for confirmation before resuming.
 */
export type ChakraPhase = 'selecting' | 'active' | 'ended'

/**
 * State for an active Chakra round.
 * Lives alongside TurnState (or replaces it) while Chakra Mode is running.
 */
export interface ChakraState {
  phase: ChakraPhase

  /** The cards shown to the describer. Length = config.chakraCardCount. */
  cards: Card[]

  /** The card the describer chose to describe. null until selection is made. */
  selectedCard: Card | null

  /**
   * The team that guessed the Chakra word first.
   * null until the round resolves.
   * TBD: what reward the winning team receives (board movement or score point)
   * will be stored here or derived from this once the rule is finalised.
   */
  winningTeamId: string | null
}


// -----------------------------------------------------------------------------
// Game State  (top-level)
// -----------------------------------------------------------------------------

/**
 * The overall phase of the game session.
 *
 * 'setup'    → Pre-game configuration screens.
 * 'playing'  → Normal turn-based gameplay.
 * 'chakra'   → A Chakra round is in progress (overlays normal play).
 * 'finished' → A win condition was met; show results screen.
 */
export type GamePhase = 'setup' | 'playing' | 'chakra' | 'finished'

/**
 * The single source of truth for the entire game session.
 *
 * Board mode note:
 *   `boardState` is declared (commented out) below but intentionally left out
 *   for the no-board build. When Section 8 is implemented, import BoardState
 *   from './board' and uncomment the field — nothing else in this file changes.
 */
export interface GameState {
  /** Fixed rules for this session — read only, never mutated after setup. */
  config: GameConfig

  phase: GamePhase

  teams: Team[]

  /** Index into `teams[]` for the team whose turn it currently is. */
  activeTeamIndex: number

  /**
   * The live turn state.
   * null between turns (e.g. during Chakra Mode or end-of-turn confirmation).
   */
  currentTurn: TurnState | null

  /**
   * Active Chakra round state.
   * null whenever Chakra Mode is not running.
   */
  chakraState: ChakraState | null

  /**
   * Cards not yet drawn this cycle.
   * When this empties, shuffle discardPile back into deck (Section 6.8).
   * Keeping deck and discardPile explicit makes the cycling rule easy to test.
   */
  deck: Card[]

  /** Cards already played this cycle. Refills deck when deck is exhausted. */
  discardPile: Card[]

  /**
   * Per-card, per-category usage tracking (Section 6.9).
   *
   * Maps cardId → array of categories already played for that card.
   * Used to avoid showing the same word twice before all words on a card are done.
   *
   * Example:
   *   { "card-001": ["Object", "Nature"], "card-002": ["Movie"] }
   *
   * When all 6 categories for a card appear in its array, the card is fully
   * exhausted and its entry is deleted on the next deck refill — making it
   * fresh again.
   */
  cardUsage: CardUsageMap

  /**
   * Record of every completed turn, oldest first.
   * The reducer pushes a TurnSummary here when a turn ends.
   * Undo pops the last entry and reverses its effects.
   */
  turnHistory: TurnSummary[]

  /**
   * Chakra bonus turn (reward = 'extra-round') bookkeeping.
   *
   * null    → normal play.
   * number  → the current turn is a Chakra bonus turn for the winning team.
   *           When it ends, activeTeamIndex is restored to this value so the
   *           regular rotation continues where it left off.
   */
  resumeTeamIndex: number | null

  /**
   * Every word guessed correctly this session, in chronological order.
   * Appended on MARK_CORRECT and CHAKRA_CORRECT; trimmed on UNDO.
   * Displayed on the Completed Words screen.
   */
  completedWords: CompletedWord[]

  // boardState?: BoardState
  // ↑ Uncomment when the board overlay is built (Section 8).
  //   Import BoardState from './board' — nothing else here needs to change.
}


// -----------------------------------------------------------------------------
// Card Usage Tracking  (Section 6.9)
// -----------------------------------------------------------------------------

/**
 * Tracks which category words have been played for each card across the session.
 *
 * Key   = card ID
 * Value = categories that have been used for that card
 *
 * When a category is played on a card, it is added to that card's array.
 * When the deck is refilled and all 6 categories are present for a card,
 * that card's entry is deleted — resetting it as fully fresh for the next cycle.
 */
export type CardUsageMap = Record<string, Category[]>

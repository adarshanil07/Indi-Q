// =============================================================================
// store/__tests__/gameReducer.test.ts
// Full coverage of every GameAction the reducer handles, including guards,
// deck refill behaviour, undo, Chakra flows, and win conditions.
// =============================================================================

import { gameReducer } from '../gameReducer'
import type { GameState } from '../../types/game'
import { CATEGORIES } from '../../constants/categories'
import { makeCard, makeCards, makeConfig, makeState, makeTurn } from '../../test-utils/fixtures'

describe('START_GAME', () => {
  it('builds teams from config names with zeroed scores and stable ids', () => {
    const config = makeConfig({ teamNames: ['Alpha', 'Beta', 'Gamma'] })
    const state = gameReducer(makeState({ phase: 'setup' }), {
      type: 'START_GAME',
      config,
      deck: makeCards(10),
    })
    expect(state.teams).toEqual([
      { id: 'team-0', name: 'Alpha', score: 0 },
      { id: 'team-1', name: 'Beta', score: 0 },
      { id: 'team-2', name: 'Gamma', score: 0 },
    ])
  })

  it('resets every session field to a clean slate', () => {
    const dirty = makeState({
      phase: 'finished',
      activeTeamIndex: 1,
      currentTurn: makeTurn(),
      turnHistory: [{ teamId: 'team-0', teamIndex: 0, scoreGained: 3, cardIds: [] }],
      completedWords: [
        { cardId: 'x', word: 'w', category: 'Movie', teamId: 'team-0', round: 0 },
      ],
      discardPile: makeCards(2),
      cardUsage: { c1: ['Movie'] },
      resumeTeamIndex: 1,
    })
    const deck = makeCards(5)
    const state = gameReducer(dirty, { type: 'START_GAME', config: makeConfig(), deck })

    expect(state.phase).toBe('playing')
    expect(state.activeTeamIndex).toBe(0)
    expect(state.currentTurn).toBeNull()
    expect(state.chakraState).toBeNull()
    expect(state.deck).toBe(deck)
    expect(state.discardPile).toEqual([])
    expect(state.cardUsage).toEqual({})
    expect(state.turnHistory).toEqual([])
    expect(state.resumeTeamIndex).toBeNull()
    expect(state.completedWords).toEqual([])
  })
})

describe('START_TURN', () => {
  it('draws the top card into a fresh waiting turn for the active team', () => {
    const state = gameReducer(
      makeState({ deck: makeCards(3), activeTeamIndex: 1 }),
      { type: 'START_TURN' },
    )
    expect(state.currentTurn).toEqual({
      teamId: 'team-1',
      phase: 'waiting',
      activeCards: [expect.objectContaining({ id: 'c1' })],
      skipsUsed: 0,
      correctIds: [],
      voidedIds: [],
      selectedCategory: null,
      timerStartedAt: null,
    })
    expect(state.deck.map(c => c.id)).toEqual(['c2', 'c3'])
  })

  it('refills from the discard pile when the deck is empty', () => {
    const state = gameReducer(
      makeState({ deck: [], discardPile: makeCards(4) }),
      { type: 'START_TURN' },
    )
    expect(state.currentTurn).not.toBeNull()
    expect(state.currentTurn!.activeCards).toHaveLength(1)
    expect(state.deck).toHaveLength(3) // 4 refilled − 1 drawn
    expect(state.discardPile).toEqual([])
  })

  it('clears exhausted card usage on refill', () => {
    const state = gameReducer(
      makeState({
        deck: [],
        discardPile: makeCards(2),
        cardUsage: { c1: [...CATEGORIES], c2: ['Movie'] },
      }),
      { type: 'START_TURN' },
    )
    expect(state.cardUsage.c1).toBeUndefined()
    expect(state.cardUsage.c2).toEqual(['Movie'])
  })

  it('is a no-op when both deck and discard are empty', () => {
    const state = makeState({ deck: [], discardPile: [] })
    expect(gameReducer(state, { type: 'START_TURN' })).toBe(state)
  })
})

describe('END_GAME', () => {
  it('moves the phase to finished and keeps everything else', () => {
    const before = makeState({ deck: makeCards(2) })
    const state = gameReducer(before, { type: 'END_GAME' })
    expect(state.phase).toBe('finished')
    expect(state.deck).toBe(before.deck)
    expect(state.teams).toBe(before.teams)
  })
})

describe('SELECT_CATEGORY', () => {
  it('locks the chosen category into the current turn', () => {
    const state = gameReducer(
      makeState({ currentTurn: makeTurn({ phase: 'waiting' }) }),
      { type: 'SELECT_CATEGORY', category: 'Nature' },
    )
    expect(state.currentTurn!.selectedCategory).toBe('Nature')
  })

  it('allows changing the selection before reveal', () => {
    let state = makeState({ currentTurn: makeTurn({ phase: 'waiting' }) })
    state = gameReducer(state, { type: 'SELECT_CATEGORY', category: 'Movie' })
    state = gameReducer(state, { type: 'SELECT_CATEGORY', category: 'People' })
    expect(state.currentTurn!.selectedCategory).toBe('People')
  })

  it('is a no-op with no current turn', () => {
    const state = makeState({ currentTurn: null })
    expect(gameReducer(state, { type: 'SELECT_CATEGORY', category: 'Movie' })).toBe(state)
  })
})

describe('REVEAL_CARD', () => {
  it('activates the turn and stamps the timer start', () => {
    const now = 1_700_000_000_000
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now)
    try {
      const state = gameReducer(
        makeState({ currentTurn: makeTurn({ phase: 'waiting' }) }),
        { type: 'REVEAL_CARD' },
      )
      expect(state.currentTurn!.phase).toBe('active')
      expect(state.currentTurn!.timerStartedAt).toBe(now)
    } finally {
      spy.mockRestore()
    }
  })

  it('is a no-op when the turn is already active (no timer restart)', () => {
    const state = makeState({
      currentTurn: makeTurn({ phase: 'active', timerStartedAt: 123 }),
    })
    expect(gameReducer(state, { type: 'REVEAL_CARD' })).toBe(state)
  })

  it('is a no-op when the turn has ended or does not exist', () => {
    const ended = makeState({ currentTurn: makeTurn({ phase: 'ended' }) })
    expect(gameReducer(ended, { type: 'REVEAL_CARD' })).toBe(ended)

    const none = makeState({ currentTurn: null })
    expect(gameReducer(none, { type: 'REVEAL_CARD' })).toBe(none)
  })
})

describe('MARK_CORRECT', () => {
  const card = makeCard('c1')

  function activeTurnState(overrides: Partial<GameState> = {}): GameState {
    return makeState({
      deck: makeCards(5).slice(1), // c2..c5
      currentTurn: makeTurn({
        phase: 'active',
        activeCards: [card],
        selectedCategory: 'Movie',
      }),
      ...overrides,
    })
  }

  it('scores the describing team and records the correct id', () => {
    const state = gameReducer(activeTurnState(), { type: 'MARK_CORRECT', cardId: 'c1' })
    expect(state.teams[0].score).toBe(1)
    expect(state.teams[1].score).toBe(0)
    expect(state.currentTurn!.correctIds).toEqual(['c1'])
  })

  it('moves the card to the discard pile', () => {
    const state = gameReducer(activeTurnState(), { type: 'MARK_CORRECT', cardId: 'c1' })
    expect(state.discardPile.map(c => c.id)).toContain('c1')
  })

  it('records card usage and logs the completed word with round number', () => {
    const state = gameReducer(
      activeTurnState({
        turnHistory: [
          { teamId: 'team-1', teamIndex: 1, scoreGained: 0, cardIds: [] },
        ],
      }),
      { type: 'MARK_CORRECT', cardId: 'c1' },
    )
    expect(state.cardUsage.c1).toEqual(['Movie'])
    expect(state.completedWords).toEqual([
      {
        cardId: 'c1',
        word: 'c1-Movie',
        wordMl: undefined,
        category: 'Movie',
        teamId: 'team-0',
        round: 1,
      },
    ])
  })

  it('draws a replacement card when the stack empties during active play', () => {
    const state = gameReducer(activeTurnState(), { type: 'MARK_CORRECT', cardId: 'c1' })
    expect(state.currentTurn!.activeCards).toHaveLength(1)
    expect(state.currentTurn!.activeCards[0].id).toBe('c2')
    expect(state.deck.map(c => c.id)).toEqual(['c3', 'c4', 'c5'])
  })

  it('does NOT draw a replacement when other skipped cards remain on screen', () => {
    const other = makeCard('c9')
    const state = gameReducer(
      activeTurnState({
        currentTurn: makeTurn({
          phase: 'active',
          activeCards: [card, other],
          selectedCategory: 'Movie',
        }),
      }),
      { type: 'MARK_CORRECT', cardId: 'c1' },
    )
    expect(state.currentTurn!.activeCards.map(c => c.id)).toEqual(['c9'])
  })

  it('does NOT draw a replacement in the ended phase (post-timer scoring)', () => {
    const state = gameReducer(
      activeTurnState({
        currentTurn: makeTurn({
          phase: 'ended',
          activeCards: [card],
          selectedCategory: 'Movie',
        }),
      }),
      { type: 'MARK_CORRECT', cardId: 'c1' },
    )
    expect(state.currentTurn!.activeCards).toEqual([])
    expect(state.teams[0].score).toBe(1) // still scores
  })

  it('refills from discard to draw the replacement when the deck is empty', () => {
    const state = gameReducer(
      activeTurnState({ deck: [], discardPile: makeCards(3).slice(1) }), // c2, c3
      { type: 'MARK_CORRECT', cardId: 'c1' },
    )
    expect(state.currentTurn!.activeCards).toHaveLength(1)
    // the marked card itself went to discard and came back into the shuffle pool
    expect(['c1', 'c2', 'c3']).toContain(state.currentTurn!.activeCards[0].id)
  })

  it('leaves the stack empty when no cards remain anywhere', () => {
    const state = gameReducer(
      activeTurnState({ deck: [], discardPile: [] }),
      { type: 'MARK_CORRECT', cardId: 'c1' },
    )
    // Only the just-marked card is in discard; refill puts it back in the deck
    // pool. Its own discard entry is the sole card, so it gets redrawn.
    expect(state.currentTurn!.activeCards.map(c => c.id)).toEqual(['c1'])
  })

  it('uses a category-aware draw in board mode', () => {
    // Deck: c2 has Movie used, c3 fresh → board mode must pick c3
    const state = gameReducer(
      activeTurnState({
        config: makeConfig({ boardMode: true }),
        deck: [makeCard('c2'), makeCard('c3')],
        cardUsage: { c2: ['Movie'] },
      }),
      { type: 'MARK_CORRECT', cardId: 'c1' },
    )
    expect(state.currentTurn!.activeCards[0].id).toBe('c3')
  })

  it('skips scoring log when no category is selected (defensive)', () => {
    const state = gameReducer(
      activeTurnState({
        currentTurn: makeTurn({ phase: 'active', activeCards: [card], selectedCategory: null }),
      }),
      { type: 'MARK_CORRECT', cardId: 'c1' },
    )
    expect(state.completedWords).toEqual([])
    expect(state.cardUsage).toEqual({})
    expect(state.teams[0].score).toBe(1) // score still counts
  })

  it('ignores voided cards', () => {
    const state = makeState({
      currentTurn: makeTurn({ phase: 'active', activeCards: [card], voidedIds: ['c1'] }),
    })
    expect(gameReducer(state, { type: 'MARK_CORRECT', cardId: 'c1' })).toBe(state)
  })

  it('ignores card ids not on screen', () => {
    const state = makeState({
      currentTurn: makeTurn({ phase: 'active', activeCards: [card] }),
    })
    expect(gameReducer(state, { type: 'MARK_CORRECT', cardId: 'nope' })).toBe(state)
  })

  it('is a no-op with no current turn', () => {
    const state = makeState({ currentTurn: null })
    expect(gameReducer(state, { type: 'MARK_CORRECT', cardId: 'c1' })).toBe(state)
  })

  it('includes the Malayalam word when the card has one', () => {
    const mlCard = makeCard('c1', {
      wordsMl: {
        People: 'പി', Location: 'ല', Object: 'ഒ', Movie: 'മൂവി', Nature: 'ന', Random: 'റ',
      },
    })
    const state = gameReducer(
      activeTurnState({
        currentTurn: makeTurn({ phase: 'active', activeCards: [mlCard], selectedCategory: 'Movie' }),
      }),
      { type: 'MARK_CORRECT', cardId: 'c1' },
    )
    expect(state.completedWords[0].wordMl).toBe('മൂവി')
  })
})

describe('VOID_CARD', () => {
  const card = makeCard('c1')

  it('marks an on-screen card as voided but keeps it visible', () => {
    const state = gameReducer(
      makeState({ currentTurn: makeTurn({ phase: 'active', activeCards: [card] }) }),
      { type: 'VOID_CARD', cardId: 'c1' },
    )
    expect(state.currentTurn!.voidedIds).toEqual(['c1'])
    expect(state.currentTurn!.activeCards).toHaveLength(1)
  })

  it('a voided card can no longer be marked correct', () => {
    let state = makeState({
      currentTurn: makeTurn({ phase: 'active', activeCards: [card], selectedCategory: 'Movie' }),
      deck: makeCards(3).slice(1),
    })
    state = gameReducer(state, { type: 'VOID_CARD', cardId: 'c1' })
    const after = gameReducer(state, { type: 'MARK_CORRECT', cardId: 'c1' })
    expect(after).toBe(state)
    expect(after.teams[0].score).toBe(0)
  })

  it('ignores double-voiding the same card', () => {
    const first = gameReducer(
      makeState({ currentTurn: makeTurn({ phase: 'active', activeCards: [card] }) }),
      { type: 'VOID_CARD', cardId: 'c1' },
    )
    expect(gameReducer(first, { type: 'VOID_CARD', cardId: 'c1' })).toBe(first)
  })

  it('ignores cards not on screen', () => {
    const state = makeState({ currentTurn: makeTurn({ phase: 'active', activeCards: [card] }) })
    expect(gameReducer(state, { type: 'VOID_CARD', cardId: 'ghost' })).toBe(state)
  })

  it('is a no-op with no current turn', () => {
    const state = makeState({ currentTurn: null })
    expect(gameReducer(state, { type: 'VOID_CARD', cardId: 'c1' })).toBe(state)
  })
})

describe('SKIP', () => {
  function skippableState(overrides: Partial<GameState> = {}): GameState {
    return makeState({
      deck: makeCards(5).slice(1), // c2..c5
      currentTurn: makeTurn({ phase: 'active', activeCards: [makeCard('c1')] }),
      ...overrides,
    })
  }

  it('pushes a newly drawn card on top of the stack and counts the skip', () => {
    const state = gameReducer(skippableState(), { type: 'SKIP' })
    expect(state.currentTurn!.activeCards.map(c => c.id)).toEqual(['c2', 'c1'])
    expect(state.currentTurn!.skipsUsed).toBe(1)
    expect(state.deck.map(c => c.id)).toEqual(['c3', 'c4', 'c5'])
  })

  it('blocks the skip at the maxActiveCards limit', () => {
    const state = skippableState({
      config: makeConfig({ maxActiveCards: 1 }),
    })
    expect(gameReducer(state, { type: 'SKIP' })).toBe(state)
  })

  it('allows skipping up to exactly the limit', () => {
    let state = skippableState({ config: makeConfig({ maxActiveCards: 3 }) })
    state = gameReducer(state, { type: 'SKIP' }) // 2 on screen
    state = gameReducer(state, { type: 'SKIP' }) // 3 on screen
    expect(state.currentTurn!.activeCards).toHaveLength(3)
    const blocked = gameReducer(state, { type: 'SKIP' })
    expect(blocked).toBe(state)
  })

  it('only works while the turn is active', () => {
    const waiting = skippableState({
      currentTurn: makeTurn({ phase: 'waiting', activeCards: [makeCard('c1')] }),
    })
    expect(gameReducer(waiting, { type: 'SKIP' })).toBe(waiting)

    const ended = skippableState({
      currentTurn: makeTurn({ phase: 'ended', activeCards: [makeCard('c1')] }),
    })
    expect(gameReducer(ended, { type: 'SKIP' })).toBe(ended)
  })

  it('refills from discard when the deck is empty', () => {
    const state = gameReducer(
      skippableState({ deck: [], discardPile: [makeCard('c8')] }),
      { type: 'SKIP' },
    )
    expect(state.currentTurn!.activeCards.map(c => c.id)).toEqual(['c8', 'c1'])
    expect(state.discardPile).toEqual([])
  })

  it('is a no-op when no cards are available anywhere', () => {
    const state = skippableState({ deck: [], discardPile: [] })
    expect(gameReducer(state, { type: 'SKIP' })).toBe(state)
  })

  it('draws category-aware in board mode', () => {
    const state = gameReducer(
      skippableState({
        config: makeConfig({ boardMode: true }),
        deck: [makeCard('c2'), makeCard('c3')],
        cardUsage: { c2: ['Nature'] },
        currentTurn: makeTurn({
          phase: 'active',
          activeCards: [makeCard('c1')],
          selectedCategory: 'Nature',
        }),
      }),
      { type: 'SKIP' },
    )
    expect(state.currentTurn!.activeCards[0].id).toBe('c3')
  })

  it('is a no-op with no current turn', () => {
    const state = makeState({ currentTurn: null, deck: makeCards(3) })
    expect(gameReducer(state, { type: 'SKIP' })).toBe(state)
  })
})

describe('TIMER_EXPIRED', () => {
  it('ends the active phase and clears the timer', () => {
    const state = gameReducer(
      makeState({ currentTurn: makeTurn({ phase: 'active', timerStartedAt: 123 }) }),
      { type: 'TIMER_EXPIRED' },
    )
    expect(state.currentTurn!.phase).toBe('ended')
    expect(state.currentTurn!.timerStartedAt).toBeNull()
  })

  it('only fires from the active phase', () => {
    const waiting = makeState({ currentTurn: makeTurn({ phase: 'waiting' }) })
    expect(gameReducer(waiting, { type: 'TIMER_EXPIRED' })).toBe(waiting)

    const ended = makeState({ currentTurn: makeTurn({ phase: 'ended' }) })
    expect(gameReducer(ended, { type: 'TIMER_EXPIRED' })).toBe(ended)

    const none = makeState({ currentTurn: null })
    expect(gameReducer(none, { type: 'TIMER_EXPIRED' })).toBe(none)
  })
})

describe('CONFIRM_TURN_END', () => {
  function endedTurnState(overrides: Partial<GameState> = {}): GameState {
    return makeState({
      currentTurn: makeTurn({
        phase: 'ended',
        activeCards: [makeCard('c4'), makeCard('c5')],
        correctIds: ['c1', 'c2'],
      }),
      teams: [
        { id: 'team-0', name: 'Red', score: 2 },
        { id: 'team-1', name: 'Blue', score: 0 },
      ],
      ...overrides,
    })
  }

  it('summarises the turn into history and rotates to the next team', () => {
    const state = gameReducer(endedTurnState(), { type: 'CONFIRM_TURN_END' })
    expect(state.turnHistory).toEqual([
      {
        teamId: 'team-0',
        teamIndex: 0,
        scoreGained: 2,
        cardIds: ['c1', 'c2', 'c4', 'c5'],
      },
    ])
    expect(state.activeTeamIndex).toBe(1)
    expect(state.currentTurn).toBeNull()
    expect(state.phase).toBe('playing')
  })

  it('discards the remaining on-screen cards without scoring them', () => {
    const state = gameReducer(endedTurnState(), { type: 'CONFIRM_TURN_END' })
    expect(state.discardPile.map(c => c.id)).toEqual(['c4', 'c5'])
    expect(state.teams[0].score).toBe(2) // unchanged — scoring happened earlier
  })

  it('wraps rotation back to the first team', () => {
    const state = gameReducer(
      endedTurnState({ activeTeamIndex: 1, currentTurn: makeTurn({ teamId: 'team-1', phase: 'ended' }) }),
      { type: 'CONFIRM_TURN_END' },
    )
    expect(state.activeTeamIndex).toBe(0)
  })

  it('finishes the game when a team hit the target score', () => {
    const state = gameReducer(
      endedTurnState({ config: makeConfig({ targetScore: 2 }) }),
      { type: 'CONFIRM_TURN_END' },
    )
    expect(state.phase).toBe('finished')
  })

  it('keeps playing when the target has not been reached', () => {
    const state = gameReducer(
      endedTurnState({ config: makeConfig({ targetScore: 10 }) }),
      { type: 'CONFIRM_TURN_END' },
    )
    expect(state.phase).toBe('playing')
  })

  it('resumes normal rotation after a Chakra bonus turn', () => {
    // Bonus turn played by team-0; play should resume with stored team 1
    const state = gameReducer(
      endedTurnState({ resumeTeamIndex: 1 }),
      { type: 'CONFIRM_TURN_END' },
    )
    expect(state.activeTeamIndex).toBe(1)
    expect(state.resumeTeamIndex).toBeNull()
    expect(state.turnHistory[0].resumeTeamIndex).toBe(1)
  })

  it('requires the turn to be in the ended phase', () => {
    const active = makeState({ currentTurn: makeTurn({ phase: 'active' }) })
    expect(gameReducer(active, { type: 'CONFIRM_TURN_END' })).toBe(active)

    const none = makeState({ currentTurn: null })
    expect(gameReducer(none, { type: 'CONFIRM_TURN_END' })).toBe(none)
  })
})

describe('RESTART_TURN', () => {
  it('discards on-screen cards, draws fresh, and resets to waiting', () => {
    const state = gameReducer(
      makeState({
        deck: [makeCard('c7')],
        currentTurn: makeTurn({
          phase: 'active',
          activeCards: [makeCard('c1'), makeCard('c2')],
          skipsUsed: 2,
          voidedIds: ['c1'],
          selectedCategory: 'Movie',
          timerStartedAt: 555,
          correctIds: ['c0'],
        }),
      }),
      { type: 'RESTART_TURN' },
    )
    expect(state.currentTurn).toEqual(
      expect.objectContaining({
        phase: 'waiting',
        activeCards: [expect.objectContaining({ id: 'c7' })],
        skipsUsed: 0,
        voidedIds: [],
        selectedCategory: null,
        timerStartedAt: null,
        correctIds: ['c0'], // points already scored this turn are kept
      }),
    )
    expect(state.discardPile.map(c => c.id)).toEqual(['c1', 'c2'])
  })

  it('recycles the discarded screen cards if the deck was empty', () => {
    const state = gameReducer(
      makeState({
        deck: [],
        discardPile: [],
        currentTurn: makeTurn({ phase: 'active', activeCards: [makeCard('c1')] }),
      }),
      { type: 'RESTART_TURN' },
    )
    // c1 goes to discard, refill shuffles it back, and it is redrawn
    expect(state.currentTurn!.activeCards.map(c => c.id)).toEqual(['c1'])
    expect(state.currentTurn!.phase).toBe('waiting')
  })

  it('is a no-op with no current turn', () => {
    const state = makeState({ currentTurn: null })
    expect(gameReducer(state, { type: 'RESTART_TURN' })).toBe(state)
  })
})

describe('UNDO', () => {
  function playedOneTurn(): GameState {
    // Team 0 scored c1 and c2; c3 was left on screen. All three in discard.
    return makeState({
      teams: [
        { id: 'team-0', name: 'Red', score: 2 },
        { id: 'team-1', name: 'Blue', score: 0 },
      ],
      activeTeamIndex: 1,
      deck: [makeCard('c9')],
      discardPile: [makeCard('c1'), makeCard('c2'), makeCard('c3')],
      turnHistory: [
        { teamId: 'team-0', teamIndex: 0, scoreGained: 2, cardIds: ['c1', 'c2', 'c3'] },
      ],
      completedWords: [
        { cardId: 'c1', word: 'c1-Movie', category: 'Movie', teamId: 'team-0', round: 0 },
        { cardId: 'c2', word: 'c2-Movie', category: 'Movie', teamId: 'team-0', round: 0 },
      ],
    })
  }

  it('reverses the last turn: score, cards, rotation, history', () => {
    const state = gameReducer(playedOneTurn(), { type: 'UNDO' })
    expect(state.teams[0].score).toBe(0)
    expect(state.deck.map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c9'])
    expect(state.discardPile).toEqual([])
    expect(state.activeTeamIndex).toBe(0)
    expect(state.turnHistory).toEqual([])
    expect(state.currentTurn).toBeNull()
    expect(state.phase).toBe('playing')
  })

  it('removes the undone turn\'s completed words', () => {
    const state = gameReducer(playedOneTurn(), { type: 'UNDO' })
    expect(state.completedWords).toEqual([])
  })

  it('keeps completed words from earlier rounds', () => {
    const base = playedOneTurn()
    const state = gameReducer(
      {
        ...base,
        turnHistory: [
          { teamId: 'team-1', teamIndex: 1, scoreGained: 1, cardIds: ['c8'] },
          ...base.turnHistory.map(t => ({ ...t })),
        ],
        completedWords: [
          { cardId: 'c8', word: 'c8-People', category: 'People', teamId: 'team-1', round: 0 },
          { cardId: 'c1', word: 'c1-Movie', category: 'Movie', teamId: 'team-0', round: 1 },
        ],
      },
      { type: 'UNDO' },
    )
    // Only the last turn (round 1, team-0) is stripped
    expect(state.completedWords).toEqual([
      { cardId: 'c8', word: 'c8-People', category: 'People', teamId: 'team-1', round: 0 },
    ])
  })

  it('keeps Chakra words that share the undone round number', () => {
    const base = playedOneTurn()
    const chakraWord = {
      cardId: 'c5',
      word: 'c5-Movie',
      category: 'Movie' as const,
      teamId: 'team-0',
      round: 0,
      isChakra: true,
    }
    const state = gameReducer(
      { ...base, completedWords: [...base.completedWords, chakraWord] },
      { type: 'UNDO' },
    )
    expect(state.completedWords).toEqual([chakraWord])
  })

  it('clamps the score at zero (manual overrides may have lowered it)', () => {
    const base = playedOneTurn()
    const state = gameReducer(
      {
        ...base,
        teams: [
          { id: 'team-0', name: 'Red', score: 1 }, // lower than scoreGained 2
          { id: 'team-1', name: 'Blue', score: 0 },
        ],
      },
      { type: 'UNDO' },
    )
    expect(state.teams[0].score).toBe(0)
  })

  it('restores Chakra bonus-turn bookkeeping', () => {
    const base = playedOneTurn()
    const state = gameReducer(
      {
        ...base,
        turnHistory: [{ ...base.turnHistory[0], resumeTeamIndex: 1 }],
      },
      { type: 'UNDO' },
    )
    expect(state.resumeTeamIndex).toBe(1)
  })

  it('is a no-op with an empty history', () => {
    const state = makeState({ turnHistory: [] })
    expect(gameReducer(state, { type: 'UNDO' })).toBe(state)
  })

  it('a full turn followed by UNDO restores score and rotation exactly', () => {
    // Integration: play a real turn through the reducer, then undo it.
    let state = makeState({ deck: makeCards(6) })
    state = gameReducer(state, { type: 'START_TURN' })
    state = gameReducer(state, { type: 'SELECT_CATEGORY', category: 'Movie' })
    state = gameReducer(state, { type: 'REVEAL_CARD' })
    const cardId = state.currentTurn!.activeCards[0].id
    state = gameReducer(state, { type: 'MARK_CORRECT', cardId })
    state = gameReducer(state, { type: 'TIMER_EXPIRED' })
    state = gameReducer(state, { type: 'CONFIRM_TURN_END' })

    expect(state.teams[0].score).toBe(1)
    expect(state.activeTeamIndex).toBe(1)

    const undone = gameReducer(state, { type: 'UNDO' })
    expect(undone.teams[0].score).toBe(0)
    expect(undone.activeTeamIndex).toBe(0)
    expect(undone.turnHistory).toEqual([])
    expect(undone.completedWords).toEqual([])
    // Every card from the turn is back in the pool
    const allIds = [...undone.deck, ...undone.discardPile].map(c => c.id).sort()
    expect(allIds).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6'])
  })
})

describe('SET_TEAM_SCORE', () => {
  it('sets the score for exactly the named team', () => {
    const state = gameReducer(makeState(), {
      type: 'SET_TEAM_SCORE',
      teamId: 'team-1',
      score: 7,
    })
    expect(state.teams[0].score).toBe(0)
    expect(state.teams[1].score).toBe(7)
  })

  it('clamps negative scores to zero', () => {
    const state = gameReducer(makeState(), {
      type: 'SET_TEAM_SCORE',
      teamId: 'team-0',
      score: -5,
    })
    expect(state.teams[0].score).toBe(0)
  })

  it('leaves state untouched for an unknown team id', () => {
    const before = makeState()
    const state = gameReducer(before, {
      type: 'SET_TEAM_SCORE',
      teamId: 'ghost',
      score: 3,
    })
    expect(state.teams).toEqual(before.teams)
  })
})

describe('TRIGGER_CHAKRA', () => {
  it('draws chakraCardCount cards and enters the chakra phase', () => {
    const state = gameReducer(
      makeState({ deck: makeCards(5), config: makeConfig({ chakraCardCount: 3 }) }),
      { type: 'TRIGGER_CHAKRA' },
    )
    expect(state.phase).toBe('chakra')
    expect(state.chakraState).toEqual({
      phase: 'selecting',
      cards: [
        expect.objectContaining({ id: 'c1' }),
        expect.objectContaining({ id: 'c2' }),
        expect.objectContaining({ id: 'c3' }),
      ],
      selectedCard: null,
      winningTeamId: null,
    })
    expect(state.deck.map(c => c.id)).toEqual(['c4', 'c5'])
  })

  it('refills from discard when the deck is short', () => {
    const state = gameReducer(
      makeState({
        deck: [makeCard('c1')],
        discardPile: [makeCard('c2'), makeCard('c3')],
        config: makeConfig({ chakraCardCount: 3 }),
      }),
      { type: 'TRIGGER_CHAKRA' },
    )
    expect(state.chakraState!.cards).toHaveLength(3)
    expect(state.discardPile).toEqual([])
  })

  it('falls back to however many cards exist when short overall', () => {
    const state = gameReducer(
      makeState({
        deck: makeCards(2),
        discardPile: [],
        config: makeConfig({ chakraCardCount: 5 }),
      }),
      { type: 'TRIGGER_CHAKRA' },
    )
    expect(state.chakraState!.cards).toHaveLength(2)
    expect(state.deck).toEqual([])
  })

  it('is a no-op when no cards exist at all', () => {
    const state = makeState({ deck: [], discardPile: [] })
    expect(gameReducer(state, { type: 'TRIGGER_CHAKRA' })).toBe(state)
  })
})

describe('SELECT_CHAKRA_CARD', () => {
  const card = makeCard('c1')

  it('locks in the chosen card and activates the round', () => {
    const state = gameReducer(
      makeState({
        phase: 'chakra',
        chakraState: { phase: 'selecting', cards: [card], selectedCard: null, winningTeamId: null },
      }),
      { type: 'SELECT_CHAKRA_CARD', card },
    )
    expect(state.chakraState!.phase).toBe('active')
    expect(state.chakraState!.selectedCard).toBe(card)
  })

  it('only works during the selecting phase', () => {
    const active = makeState({
      phase: 'chakra',
      chakraState: { phase: 'active', cards: [card], selectedCard: card, winningTeamId: null },
    })
    expect(gameReducer(active, { type: 'SELECT_CHAKRA_CARD', card })).toBe(active)

    const none = makeState({ chakraState: null })
    expect(gameReducer(none, { type: 'SELECT_CHAKRA_CARD', card })).toBe(none)
  })
})

describe('CHAKRA_CORRECT', () => {
  const card = makeCard('c1', { chakraCategory: 'Nature' })

  function activeChakra(overrides: Partial<GameState> = {}): GameState {
    return makeState({
      phase: 'chakra',
      chakraState: { phase: 'active', cards: [card], selectedCard: card, winningTeamId: null },
      ...overrides,
    })
  }

  it('awards a numeric reward to the winning team immediately', () => {
    const state = gameReducer(
      activeChakra({ config: makeConfig({ chakraReward: 2 }) }),
      { type: 'CHAKRA_CORRECT', winningTeamId: 'team-1' },
    )
    expect(state.teams[1].score).toBe(2)
    expect(state.teams[0].score).toBe(0)
    expect(state.chakraState!.phase).toBe('ended')
    expect(state.chakraState!.winningTeamId).toBe('team-1')
  })

  it('does not change scores for the extra-round reward', () => {
    const state = gameReducer(
      activeChakra({ config: makeConfig({ chakraReward: 'extra-round' }) }),
      { type: 'CHAKRA_CORRECT', winningTeamId: 'team-1' },
    )
    expect(state.teams[0].score).toBe(0)
    expect(state.teams[1].score).toBe(0)
    expect(state.chakraState!.phase).toBe('ended')
  })

  it('logs the chakra word with isChakra and the chakra category', () => {
    const state = gameReducer(
      activeChakra({
        turnHistory: [{ teamId: 'team-0', teamIndex: 0, scoreGained: 0, cardIds: [] }],
      }),
      { type: 'CHAKRA_CORRECT', winningTeamId: 'team-0' },
    )
    expect(state.completedWords).toEqual([
      {
        cardId: 'c1',
        word: 'c1-Nature',
        wordMl: undefined,
        category: 'Nature',
        teamId: 'team-0',
        round: 1,
        isChakra: true,
      },
    ])
  })

  it('only fires during the active chakra phase', () => {
    const selecting = makeState({
      phase: 'chakra',
      chakraState: { phase: 'selecting', cards: [card], selectedCard: null, winningTeamId: null },
    })
    expect(gameReducer(selecting, { type: 'CHAKRA_CORRECT', winningTeamId: 'team-0' })).toBe(selecting)

    const none = makeState({ chakraState: null })
    expect(gameReducer(none, { type: 'CHAKRA_CORRECT', winningTeamId: 'team-0' })).toBe(none)
  })
})

describe('CONFIRM_CHAKRA_END', () => {
  const cards = makeCards(3)

  function endedChakra(overrides: Partial<GameState> = {}): GameState {
    return makeState({
      phase: 'chakra',
      activeTeamIndex: 0,
      chakraState: {
        phase: 'ended',
        cards,
        selectedCard: cards[0],
        winningTeamId: 'team-1',
      },
      ...overrides,
    })
  }

  it('discards the chakra cards and clears chakra state', () => {
    const state = gameReducer(endedChakra(), { type: 'CONFIRM_CHAKRA_END' })
    expect(state.chakraState).toBeNull()
    expect(state.discardPile.map(c => c.id)).toEqual(['c1', 'c2', 'c3'])
    expect(state.phase).toBe('playing')
  })

  it('advances rotation past the team whose turn the chakra replaced', () => {
    const state = gameReducer(endedChakra(), { type: 'CONFIRM_CHAKRA_END' })
    expect(state.activeTeamIndex).toBe(1)
    expect(state.resumeTeamIndex).toBeNull()
  })

  it('queues a bonus turn for the winner under the extra-round reward', () => {
    const state = gameReducer(
      endedChakra({
        config: makeConfig({ chakraReward: 'extra-round' }),
        activeTeamIndex: 1, // team-1's turn was replaced; next would be team-0
        chakraState: {
          phase: 'ended',
          cards,
          selectedCard: cards[0],
          winningTeamId: 'team-1',
        },
      }),
      { type: 'CONFIRM_CHAKRA_END' },
    )
    // Winner (team-1) plays the bonus turn now; rotation resumes with team-0
    expect(state.activeTeamIndex).toBe(1)
    expect(state.resumeTeamIndex).toBe(0)
  })

  it('advances normally under extra-round when nobody won', () => {
    const state = gameReducer(
      endedChakra({
        config: makeConfig({ chakraReward: 'extra-round' }),
        chakraState: { phase: 'ended', cards, selectedCard: cards[0], winningTeamId: null },
      }),
      { type: 'CONFIRM_CHAKRA_END' },
    )
    expect(state.activeTeamIndex).toBe(1)
    expect(state.resumeTeamIndex).toBeNull()
  })

  it('finishes the game when the points reward reached the target', () => {
    const state = gameReducer(
      endedChakra({
        config: makeConfig({ chakraReward: 3, targetScore: 3 }),
        teams: [
          { id: 'team-0', name: 'Red', score: 0 },
          { id: 'team-1', name: 'Blue', score: 3 }, // already awarded by CHAKRA_CORRECT
        ],
      }),
      { type: 'CONFIRM_CHAKRA_END' },
    )
    expect(state.phase).toBe('finished')
  })

  it('is a no-op with no chakra state', () => {
    const state = makeState({ chakraState: null })
    expect(gameReducer(state, { type: 'CONFIRM_CHAKRA_END' })).toBe(state)
  })

  it('full chakra flow: trigger → select → correct → confirm', () => {
    let state = makeState({
      deck: makeCards(6),
      config: makeConfig({ chakraCardCount: 3, chakraReward: 1 }),
    })
    state = gameReducer(state, { type: 'TRIGGER_CHAKRA' })
    const chosen = state.chakraState!.cards[1]
    state = gameReducer(state, { type: 'SELECT_CHAKRA_CARD', card: chosen })
    state = gameReducer(state, { type: 'CHAKRA_CORRECT', winningTeamId: 'team-1' })
    state = gameReducer(state, { type: 'CONFIRM_CHAKRA_END' })

    expect(state.phase).toBe('playing')
    expect(state.teams[1].score).toBe(1)
    expect(state.chakraState).toBeNull()
    expect(state.completedWords).toHaveLength(1)
    expect(state.completedWords[0].isChakra).toBe(true)
    // The three chakra cards all went to discard
    expect(state.discardPile).toHaveLength(3)
    expect(state.deck).toHaveLength(3)
  })
})

describe('unknown action', () => {
  it('returns the state unchanged', () => {
    const state = makeState()
    // Cast: deliberately simulating an action the reducer does not know
    const result = gameReducer(state, { type: 'NOT_A_REAL_ACTION' } as never)
    expect(result).toBe(state)
  })
})

describe('multi-turn game simulation', () => {
  it('plays three full turns with correct rotation and scoring', () => {
    let state = makeState({
      deck: makeCards(12),
      config: makeConfig({ teamNames: ['Red', 'Blue'], maxActiveCards: 2 }),
    })

    for (let turnNo = 0; turnNo < 3; turnNo++) {
      const expectedTeam = turnNo % 2
      expect(state.activeTeamIndex).toBe(expectedTeam)

      state = gameReducer(state, { type: 'START_TURN' })
      state = gameReducer(state, { type: 'SELECT_CATEGORY', category: 'People' })
      state = gameReducer(state, { type: 'REVEAL_CARD' })
      const cardId = state.currentTurn!.activeCards[0].id
      state = gameReducer(state, { type: 'MARK_CORRECT', cardId })
      state = gameReducer(state, { type: 'SKIP' })
      state = gameReducer(state, { type: 'TIMER_EXPIRED' })
      state = gameReducer(state, { type: 'CONFIRM_TURN_END' })
    }

    expect(state.turnHistory).toHaveLength(3)
    expect(state.teams[0].score).toBe(2) // turns 0 and 2
    expect(state.teams[1].score).toBe(1) // turn 1
    expect(state.activeTeamIndex).toBe(1) // next up after turn 3

    // Card conservation: every card is in exactly one place
    const everywhere = [
      ...state.deck.map(c => c.id),
      ...state.discardPile.map(c => c.id),
    ]
    expect(everywhere.sort()).toEqual(makeCards(12).map(c => c.id).sort())
    expect(new Set(everywhere).size).toBe(12)
  })

  it('cycles the deck indefinitely with a tiny deck', () => {
    let state = makeState({ deck: makeCards(2), config: makeConfig({ maxActiveCards: 1 }) })

    for (let i = 0; i < 6; i++) {
      state = gameReducer(state, { type: 'START_TURN' })
      expect(state.currentTurn).not.toBeNull()
      state = gameReducer(state, { type: 'SELECT_CATEGORY', category: 'Movie' })
      state = gameReducer(state, { type: 'REVEAL_CARD' })
      const cardId = state.currentTurn!.activeCards[0].id
      state = gameReducer(state, { type: 'MARK_CORRECT', cardId })
      state = gameReducer(state, { type: 'TIMER_EXPIRED' })
      state = gameReducer(state, { type: 'CONFIRM_TURN_END' })
    }

    expect(state.turnHistory).toHaveLength(6)
    // Both cards still exist somewhere — nothing was lost or duplicated
    const everywhere = [...state.deck, ...state.discardPile].map(c => c.id).sort()
    expect(everywhere).toEqual(['c1', 'c2'])
  })
})

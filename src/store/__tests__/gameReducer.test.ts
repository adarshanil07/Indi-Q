import { gameReducer } from '../gameReducer'
import type { GameAction } from '../gameActions'
import type { GameState } from '../../types/game'
import { FINISH_INDEX } from '../../constants/board'
import { makeCard, makeDeck, makeConfig, playActions, startedTurn } from '../../testUtils/factories'

const step = (state: GameState, action: GameAction) => gameReducer(state, action)

describe('START_GAME', () => {
  it('initialises teams, deck, and playing phase', () => {
    const state = playActions(makeConfig(), makeDeck(10), [])
    expect(state.phase).toBe('playing')
    expect(state.teams).toHaveLength(2)
    expect(state.teams[0]).toEqual({ id: 'team-0', name: 'Team A', score: 0 })
    expect(state.deck).toHaveLength(10)
    expect(state.currentTurn).toBeNull()
    expect(state.boardPositions).toEqual([])
  })

  it('starts every team on space 0 in board mode', () => {
    const state = playActions(makeConfig({ boardMode: true, teamNames: ['A', 'B', 'C'] }), makeDeck(10), [])
    expect(state.boardPositions).toEqual([0, 0, 0])
  })
})

describe('START_TURN', () => {
  it('draws one card into a waiting turn', () => {
    const state = playActions(makeConfig(), makeDeck(10), [{ type: 'START_TURN' }])
    expect(state.currentTurn?.phase).toBe('waiting')
    expect(state.currentTurn?.activeCards.map(c => c.id)).toEqual(['c1'])
    expect(state.deck).toHaveLength(9)
    expect(state.currentTurn?.selectedCategory).toBeNull()
    expect(state.currentTurn?.timerStartedAt).toBeNull()
  })

  it('board mode: locks the category dictated by the space the team is on', () => {
    // Space 0 in the board layout is Object.
    const state = playActions(makeConfig({ boardMode: true }), makeDeck(10), [{ type: 'START_TURN' }])
    expect(state.currentTurn?.selectedCategory).toBe('Object')
    expect(state.currentTurn?.categoryLocked).toBe(true)
  })

  it('is a no-op when deck and discard are both empty', () => {
    const state = playActions(makeConfig(), [], [{ type: 'START_TURN' }])
    expect(state.currentTurn).toBeNull()
  })
})

describe('SELECT_CATEGORY and REVEAL_CARD', () => {
  it('selects a category then starts the timer on reveal', () => {
    const state = startedTurn(makeConfig(), makeDeck(10), { reveal: false, category: 'Movie' })
    expect(state.currentTurn?.selectedCategory).toBe('Movie')
    const revealed = step(state, { type: 'REVEAL_CARD' })
    expect(revealed.currentTurn?.phase).toBe('active')
    expect(revealed.currentTurn?.timerStartedAt).toEqual(expect.any(Number))
  })

  it('ignores category changes once locked', () => {
    const state = playActions(makeConfig({ boardMode: true }), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'Movie' },
    ])
    expect(state.currentTurn?.selectedCategory).toBe('Object')
  })

  it('ignores REVEAL_CARD when the turn is not waiting', () => {
    const active = startedTurn()
    expect(step(active, { type: 'REVEAL_CARD' })).toBe(active)
  })
})

describe('MARK_CORRECT', () => {
  it('scores a point, removes the card, logs the word, and draws a replacement', () => {
    const state = startedTurn(makeConfig(), makeDeck(10), { category: 'Movie' })
    const next = step(state, { type: 'MARK_CORRECT', cardId: 'c1' })
    expect(next.teams[0].score).toBe(1)
    expect(next.currentTurn?.correctIds).toEqual(['c1'])
    // Replacement drawn because no playable card remained
    expect(next.currentTurn?.activeCards.map(c => c.id)).toEqual(['c2'])
    expect(next.completedWords).toEqual([
      expect.objectContaining({ cardId: 'c1', word: 'c1-Movie', category: 'Movie', teamId: 'team-0', round: 0 }),
    ])
    expect(next.cardUsage.c1).toEqual(['Movie'])
    expect(next.discardPile.map(c => c.id)).toEqual(['c1'])
  })

  it('does not draw a replacement while another playable card remains', () => {
    const state = playActions(makeConfig({ maxActiveCards: 2 }), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
      { type: 'SKIP' }, // stack: c2 (new), c1
      { type: 'MARK_CORRECT', cardId: 'c2' },
    ])
    expect(state.currentTurn?.activeCards.map(c => c.id)).toEqual(['c1'])
  })

  it('ignores voided and unknown cards', () => {
    const state = playActions(makeConfig(), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
      { type: 'VOID_CARD', cardId: 'c1' },
    ])
    expect(step(state, { type: 'MARK_CORRECT', cardId: 'c1' })).toBe(state)
    expect(step(state, { type: 'MARK_CORRECT', cardId: 'nope' })).toBe(state)
  })

  it('uses the card’s own chakra word on a chakra-words turn', () => {
    // Winning an extra-round chakra queues a bonus turn, which plays ☸ words.
    const deck = [makeCard('k1', 'Nature'), ...makeDeck(9)]
    const state = playActions(makeConfig({ chakraReward: 'extra-round', chakraCardCount: 1 }), deck, [
      { type: 'TRIGGER_CHAKRA' },
      { type: 'SELECT_CHAKRA_CARD', card: deck[0] },
      { type: 'CHAKRA_CORRECT', winningTeamId: 'team-1' },
      { type: 'CONFIRM_CHAKRA_END' },
      { type: 'START_TURN' },
      { type: 'REVEAL_CARD' },
    ])
    expect(state.activeTeamIndex).toBe(1) // winner plays the bonus turn
    expect(state.currentTurn?.chakraWords).toBe(true)
    const topCard = state.currentTurn!.activeCards[0]
    const next = step(state, { type: 'MARK_CORRECT', cardId: topCard.id })
    expect(next.completedWords.at(-1)).toEqual(
      expect.objectContaining({ category: topCard.chakraCategory, teamId: 'team-1' }),
    )
  })
})

describe('SKIP', () => {
  it('adds a new card on top until maxActiveCards is reached', () => {
    const state = startedTurn(makeConfig({ maxActiveCards: 2 }), makeDeck(10))
    const skipped = step(state, { type: 'SKIP' })
    expect(skipped.currentTurn?.activeCards.map(c => c.id)).toEqual(['c2', 'c1'])
    expect(skipped.currentTurn?.skipsUsed).toBe(1)
    // At the limit now — further skips are ignored
    expect(step(skipped, { type: 'SKIP' })).toBe(skipped)
  })

  it('does not count voided cards against the skip limit', () => {
    const state = playActions(makeConfig({ maxActiveCards: 2 }), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
      { type: 'VOID_CARD', cardId: 'c1' }, // auto-draws replacement c2; c1 parked
      { type: 'SKIP' },                    // playable count is 1 → allowed
    ])
    expect(state.currentTurn?.skipsUsed).toBe(1)
    expect(state.currentTurn?.activeCards).toHaveLength(3)
  })

  it('is ignored before reveal and when the deck cannot supply a card', () => {
    const waiting = startedTurn(makeConfig(), makeDeck(10), { reveal: false })
    expect(step(waiting, { type: 'SKIP' })).toBe(waiting)

    const oneCard = startedTurn(makeConfig({ maxActiveCards: 5 }), makeDeck(1))
    expect(step(oneCard, { type: 'SKIP' })).toBe(oneCard) // deck + discard empty
  })

  it('supports unlimited skips via the sentinel', () => {
    let state = startedTurn(makeConfig({ maxActiveCards: 999 }), makeDeck(8))
    for (let i = 0; i < 7; i++) state = step(state, { type: 'SKIP' })
    expect(state.currentTurn?.activeCards).toHaveLength(8)
  })
})

describe('VOID_CARD', () => {
  it('parks the card at the bottom, unplayable, and draws a replacement', () => {
    const state = startedTurn(makeConfig(), makeDeck(10))
    const next = step(state, { type: 'VOID_CARD', cardId: 'c1' })
    expect(next.currentTurn?.voidedIds).toEqual(['c1'])
    expect(next.currentTurn?.activeCards.map(c => c.id)).toEqual(['c2', 'c1'])
    expect(next.teams[0].score).toBe(0)
    // Voiding twice is a no-op
    expect(step(next, { type: 'VOID_CARD', cardId: 'c1' })).toBe(next)
  })
})

describe('UNDO_CORRECT', () => {
  it('reverses the point, the word log, usage tracking, and returns the card', () => {
    const state = playActions(makeConfig(), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
      { type: 'MARK_CORRECT', cardId: 'c1' },
    ])
    const undone = step(state, { type: 'UNDO_CORRECT', cardId: 'c1' })
    expect(undone.teams[0].score).toBe(0)
    expect(undone.completedWords).toEqual([])
    expect(undone.cardUsage.c1).toBeUndefined()
    expect(undone.currentTurn?.correctIds).toEqual([])
    // c1 comes back on top of the stack, alongside the drawn c2
    expect(undone.currentTurn?.activeCards.map(c => c.id)).toEqual(['c1', 'c2'])
  })

  it('ignores ids that were never marked correct', () => {
    const state = startedTurn()
    expect(step(state, { type: 'UNDO_CORRECT', cardId: 'c1' })).toBe(state)
  })
})

describe('timer and turn end', () => {
  it('TIMER_EXPIRED moves an active turn to ended', () => {
    const state = startedTurn()
    const ended = step(state, { type: 'TIMER_EXPIRED' })
    expect(ended.currentTurn?.phase).toBe('ended')
    expect(ended.currentTurn?.timerStartedAt).toBeNull()
    // Only fires from 'active'
    expect(step(ended, { type: 'TIMER_EXPIRED' })).toBe(ended)
  })

  it('still allows a buzzer-beater correct after time is up', () => {
    const state = playActions(makeConfig(), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
      { type: 'TIMER_EXPIRED' },
      { type: 'MARK_CORRECT', cardId: 'c1' },
    ])
    expect(state.teams[0].score).toBe(1)
    // But no replacement card is drawn once the turn has ended
    expect(state.currentTurn?.activeCards).toHaveLength(0)
  })

  it('CONFIRM_TURN_END discards leftovers, records history, and rotates teams', () => {
    const state = playActions(makeConfig(), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
      { type: 'MARK_CORRECT', cardId: 'c1' },
      { type: 'TIMER_EXPIRED' },
      { type: 'CONFIRM_TURN_END' },
    ])
    expect(state.currentTurn).toBeNull()
    expect(state.activeTeamIndex).toBe(1)
    expect(state.turnHistory).toHaveLength(1)
    expect(state.turnHistory[0]).toEqual(
      expect.objectContaining({ kind: 'turn', teamId: 'team-0', scoreGained: 1 }),
    )
    // c1 (scored) and c2 (left on screen) are both in the discard pile
    expect(state.discardPile.map(c => c.id).sort()).toEqual(['c1', 'c2'])
  })
})

describe('board movement', () => {
  function playTurnWithCorrects(state: GameState, count: number): GameState {
    let s = step(state, { type: 'START_TURN' })
    s = step(s, { type: 'REVEAL_CARD' })
    for (let i = 0; i < count; i++) {
      const top = s.currentTurn!.activeCards[0]
      s = step(s, { type: 'MARK_CORRECT', cardId: top.id })
    }
    s = step(s, { type: 'TIMER_EXPIRED' })
    return step(s, { type: 'CONFIRM_TURN_END' })
  }

  it('advances the piece one space per correct answer', () => {
    const start = playActions(makeConfig({ boardMode: true }), makeDeck(20), [])
    const after = playTurnWithCorrects(start, 2)
    expect(after.boardPositions).toEqual([2, 0])
  })

  it('clamps movement at the FINISH space', () => {
    const start = playActions(makeConfig({ boardMode: true }), makeDeck(20), [])
    const nearFinish = { ...start, boardPositions: [FINISH_INDEX - 1, 0] }
    const after = playTurnWithCorrects(nearFinish, 3)
    expect(after.boardPositions[0]).toBe(FINISH_INDEX)
  })
})

describe('final-round fairness rule', () => {
  const config = makeConfig({ teamNames: ['A', 'B', 'C'], targetScore: 1 })

  function playScoringTurn(state: GameState): GameState {
    let s = step(state, { type: 'START_TURN' })
    s = step(s, { type: 'SELECT_CATEGORY', category: 'People' })
    s = step(s, { type: 'REVEAL_CARD' })
    const top = s.currentTurn!.activeCards[0]
    s = step(s, { type: 'MARK_CORRECT', cardId: top.id })
    s = step(s, { type: 'TIMER_EXPIRED' })
    return step(s, { type: 'CONFIRM_TURN_END' })
  }

  function playEmptyTurn(state: GameState): GameState {
    let s = step(state, { type: 'START_TURN' })
    s = step(s, { type: 'SELECT_CATEGORY', category: 'People' })
    s = step(s, { type: 'REVEAL_CARD' })
    s = step(s, { type: 'TIMER_EXPIRED' })
    return step(s, { type: 'CONFIRM_TURN_END' })
  }

  it('grants the remaining teams one final turn when the first team hits the target', () => {
    const start = playActions(config, makeDeck(20), [])
    const afterA = playScoringTurn(start) // Team A reaches target
    expect(afterA.phase).toBe('playing')
    expect(afterA.finalRound).toEqual({ triggeredBy: 'team-0', turnsLeft: 2 })

    const afterB = playEmptyTurn(afterA)
    expect(afterB.finalRound?.turnsLeft).toBe(1)
    expect(afterB.phase).toBe('playing')

    const afterC = playEmptyTurn(afterB)
    expect(afterC.phase).toBe('finished')
  })

  it('ends immediately when the LAST team in rotation reaches the target', () => {
    const start = playActions(config, makeDeck(20), [])
    const afterA = playEmptyTurn(start)
    const afterB = playEmptyTurn(afterA)
    const afterC = playScoringTurn(afterB) // last team in the cycle
    expect(afterC.finalRound).toBeNull()
    expect(afterC.phase).toBe('finished')
  })
})

describe('UNDO (whole turn)', () => {
  it('reverses score, rotation, history, words, and returns cards to the deck', () => {
    const before = playActions(makeConfig(), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
      { type: 'MARK_CORRECT', cardId: 'c1' },
      { type: 'TIMER_EXPIRED' },
      { type: 'CONFIRM_TURN_END' },
    ])
    const undone = step(before, { type: 'UNDO' })
    expect(undone.teams[0].score).toBe(0)
    expect(undone.activeTeamIndex).toBe(0)
    expect(undone.turnHistory).toEqual([])
    expect(undone.completedWords).toEqual([])
    expect(undone.discardPile).toEqual([])
    expect(undone.cardUsage.c1).toBeUndefined()
    // All 10 cards accounted for again
    expect(undone.deck).toHaveLength(10)
  })

  it('restores board position on undo', () => {
    let s = playActions(makeConfig({ boardMode: true }), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'REVEAL_CARD' },
    ])
    const top = s.currentTurn!.activeCards[0]
    s = step(s, { type: 'MARK_CORRECT', cardId: top.id })
    s = step(s, { type: 'TIMER_EXPIRED' })
    s = step(s, { type: 'CONFIRM_TURN_END' })
    expect(s.boardPositions[0]).toBe(1)
    const undone = step(s, { type: 'UNDO' })
    expect(undone.boardPositions[0]).toBe(0)
  })

  it('is a no-op with no history', () => {
    const state = playActions(makeConfig(), makeDeck(10), [])
    expect(step(state, { type: 'UNDO' })).toBe(state)
  })
})

describe('SET_TEAM_SCORE', () => {
  it('sets the score and clamps below zero', () => {
    const state = playActions(makeConfig(), makeDeck(10), [
      { type: 'SET_TEAM_SCORE', teamId: 'team-0', score: 7 },
    ])
    expect(state.teams[0].score).toBe(7)
    const clamped = step(state, { type: 'SET_TEAM_SCORE', teamId: 'team-0', score: -3 })
    expect(clamped.teams[0].score).toBe(0)
  })
})

describe('chakra rounds', () => {
  it('TRIGGER_CHAKRA deals the configured number of cards', () => {
    const state = playActions(makeConfig({ chakraCardCount: 3 }), makeDeck(10), [
      { type: 'TRIGGER_CHAKRA' },
    ])
    expect(state.phase).toBe('chakra')
    expect(state.chakraState?.cards).toHaveLength(3)
    expect(state.deck).toHaveLength(7)
  })

  it('refills from the discard pile when the deck is short', () => {
    const start = playActions(makeConfig({ chakraCardCount: 3 }), makeDeck(3), [])
    const short = { ...start, deck: start.deck.slice(0, 1), discardPile: start.deck.slice(1) }
    const state = step(short, { type: 'TRIGGER_CHAKRA' })
    expect(state.chakraState?.cards).toHaveLength(3)
  })

  it('deals what it can when fewer cards exist than configured', () => {
    const state = playActions(makeConfig({ chakraCardCount: 5 }), makeDeck(2), [
      { type: 'TRIGGER_CHAKRA' },
    ])
    expect(state.chakraState?.cards).toHaveLength(2)
  })

  it('is a no-op with no cards at all', () => {
    const state = playActions(makeConfig(), [], [])
    expect(step(state, { type: 'TRIGGER_CHAKRA' })).toBe(state)
  })

  it('CANCEL_CHAKRA moves the offered cards to the discard, words unspent', () => {
    // The describer saw the offered cards, so they count as recently seen and
    // go to the back of the discard pile — but no word was spoken, so their
    // usage stays untouched and every word remains fresh.
    const state = playActions(makeConfig({ chakraCardCount: 3 }), makeDeck(10), [
      { type: 'TRIGGER_CHAKRA' },
      { type: 'CANCEL_CHAKRA' },
    ])
    expect(state.phase).toBe('playing')
    expect(state.chakraState).toBeNull()
    expect(state.deck).toHaveLength(7)
    expect(state.discardPile.map(c => c.id)).toEqual(['c1', 'c2', 'c3'])
    expect(state.cardUsage).toEqual({})
  })

  it('numeric reward: winner gains points and rotation advances', () => {
    const deck = makeDeck(10)
    const state = playActions(makeConfig({ chakraReward: 2, chakraCardCount: 2 }), deck, [
      { type: 'TRIGGER_CHAKRA' },
      { type: 'SELECT_CHAKRA_CARD', card: deck[0] },
      { type: 'CHAKRA_CORRECT', winningTeamId: 'team-1' },
      { type: 'CONFIRM_CHAKRA_END' },
    ])
    expect(state.teams[1].score).toBe(2)
    expect(state.phase).toBe('playing')
    expect(state.activeTeamIndex).toBe(1) // rotation advanced past team-0
    expect(state.resumeTeamIndex).toBeNull()
    expect(state.completedWords.at(-1)).toEqual(
      expect.objectContaining({ isChakra: true, teamId: 'team-1' }),
    )
    expect(state.turnHistory.at(-1)).toEqual(
      expect.objectContaining({ kind: 'chakra', scoreGained: 2 }),
    )
  })

  it('extra-round reward: winner queues a bonus turn, then play resumes in order', () => {
    const deck = makeDeck(10)
    let state = playActions(makeConfig({ chakraReward: 'extra-round', chakraCardCount: 1 }), deck, [
      { type: 'TRIGGER_CHAKRA' },
      { type: 'SELECT_CHAKRA_CARD', card: deck[0] },
      { type: 'CHAKRA_CORRECT', winningTeamId: 'team-0' },
      { type: 'CONFIRM_CHAKRA_END' },
    ])
    expect(state.activeTeamIndex).toBe(0)  // winner plays first
    expect(state.resumeTeamIndex).toBe(1)  // then team-1 is up

    // Play the bonus turn through
    state = step(state, { type: 'START_TURN' })
    expect(state.currentTurn?.chakraWords).toBe(true)
    state = step(state, { type: 'REVEAL_CARD' })
    state = step(state, { type: 'TIMER_EXPIRED' })
    state = step(state, { type: 'CONFIRM_TURN_END' })
    expect(state.activeTeamIndex).toBe(1)
    expect(state.resumeTeamIndex).toBeNull()
  })

  it('board mode: numeric reward moves the winner forward instead of scoring', () => {
    const deck = makeDeck(10)
    const state = playActions(makeConfig({ boardMode: true, chakraReward: 3, chakraCardCount: 1 }), deck, [
      { type: 'TRIGGER_CHAKRA' },
      { type: 'SELECT_CHAKRA_CARD', card: deck[0] },
      { type: 'CHAKRA_CORRECT', winningTeamId: 'team-1' },
      { type: 'CONFIRM_CHAKRA_END' },
    ])
    expect(state.teams[1].score).toBe(0)
    expect(state.boardPositions[1]).toBe(3)
  })

  it('undoing a chakra round restores the winner’s points', () => {
    const deck = makeDeck(10)
    const state = playActions(makeConfig({ chakraReward: 2, chakraCardCount: 2 }), deck, [
      { type: 'TRIGGER_CHAKRA' },
      { type: 'SELECT_CHAKRA_CARD', card: deck[0] },
      { type: 'CHAKRA_CORRECT', winningTeamId: 'team-1' },
      { type: 'CONFIRM_CHAKRA_END' },
      { type: 'UNDO' },
    ])
    expect(state.teams[1].score).toBe(0)
    expect(state.turnHistory).toEqual([])
    expect(state.completedWords).toEqual([])
    expect(state.deck).toHaveLength(10)
  })
})

describe('deck cycling', () => {
  it('draws from the discard pool once the deck is spent — no refill step', () => {
    // 2-card deck: turn 1 consumes c1 (scored → discard) and c2 (drawn).
    let state = playActions(makeConfig(), makeDeck(2), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
      { type: 'MARK_CORRECT', cardId: 'c1' },
      { type: 'TIMER_EXPIRED' },
      { type: 'CONFIRM_TURN_END' },
    ])
    expect(state.deck).toHaveLength(0)
    expect(state.discardPile).toHaveLength(2)

    // Turn 2 starts by pulling the least-recently-seen card straight from
    // the discard pool; the pile shrinks by exactly that one card.
    state = step(state, { type: 'START_TURN' })
    expect(state.currentTurn?.activeCards.map(c => c.id)).toEqual(['c1'])
    expect(state.discardPile.map(c => c.id)).toEqual(['c2'])
  })

  it('RESTART_TURN deals a fresh card, keeps points, and locks the category', () => {
    const state = playActions(makeConfig(), makeDeck(10), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'Nature' },
      { type: 'REVEAL_CARD' },
      { type: 'MARK_CORRECT', cardId: 'c1' },
      { type: 'RESTART_TURN' },
    ])
    expect(state.currentTurn?.phase).toBe('waiting')
    expect(state.currentTurn?.activeCards).toHaveLength(1)
    expect(state.currentTurn?.correctIds).toEqual(['c1']) // points kept
    expect(state.currentTurn?.selectedCategory).toBe('Nature')
    expect(state.currentTurn?.categoryLocked).toBe(true)
    expect(state.currentTurn?.timerStartedAt).toBeNull()
  })
})

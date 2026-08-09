// =============================================================================
// End-to-end guarantees of the word-freshness algorithm, driven through the
// real reducer:
//
//   - a word never repeats within its category until every card's word for
//     that category is spent (then oldest-first repeats keep play going)
//   - a card CAN return for a different category — the point of the redesign
//   - the score edition re-resolves the face-down opening card at reveal
//   - voided words are burned (spoken aloud) and restored by undo
//   - a played ☸ word is burned and never re-offered while fresh ones exist
// =============================================================================

import { gameReducer } from '../gameReducer'
import { makeConfig, makeDeck, playActions } from '../../testUtils/factories'
import type { GameState } from '../../types/game'
import type { GameAction } from '../gameActions'

const config = () => makeConfig({ maxActiveCards: 2 })

function run(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state)
}

/** Play one full score-mode turn: reveal, mark N corrects, end, confirm. */
function playTurn(state: GameState, category: 'People' | 'Location', corrects: number): GameState {
  let s = run(state, [
    { type: 'START_TURN' },
    { type: 'SELECT_CATEGORY', category },
    { type: 'REVEAL_CARD' },
  ])
  for (let i = 0; i < corrects; i++) {
    const top = s.currentTurn!.activeCards.find(c => !s.currentTurn!.voidedIds.includes(c.id))!
    s = gameReducer(s, { type: 'MARK_CORRECT', cardId: top.id })
  }
  return run(s, [{ type: 'TIMER_EXPIRED' }, { type: 'CONFIRM_TURN_END' }])
}

describe('word freshness across turns', () => {
  it('never repeats a word within a category until the category is exhausted', () => {
    // 4 cards, 5 single-correct People turns: first four words distinct,
    // the fifth is the oldest repeat.
    let state = playActions(config(), makeDeck(4), [])
    for (let t = 0; t < 5; t++) state = playTurn(state, 'People', 1)

    const words = state.completedWords.map(w => w.word)
    expect(words).toHaveLength(5)
    expect(new Set(words.slice(0, 4)).size).toBe(4)
    expect(words.slice(0, 4)).toContain(words[4])
  })

  it('reuses a card for a different category', () => {
    // 2 cards. Turn 1 (People) scores c1 and ends with c2 on screen. Turn 2
    // (Location) must bring back the least-recently-seen card, c1 — its
    // Location word is untouched.
    let state = playActions(config(), makeDeck(2), [])
    state = playTurn(state, 'People', 1)
    state = run(state, [{ type: 'START_TURN' }])
    expect(state.currentTurn!.activeCards[0].id).toBe('c1')
  })
})

describe('score edition re-resolves the opening card at reveal', () => {
  it('swaps a stale face-down card for one whose word is fresh', () => {
    // c1's People word gets spent in turn 1. Turn 2 opens face-down with c1
    // (least recently seen) — choosing People again must swap in c2 before
    // anything is revealed, returning c1 to the deck front unseen.
    let state = playActions(config(), makeDeck(2), [])
    state = playTurn(state, 'People', 1)
    state = run(state, [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
    ])
    expect(state.currentTurn!.activeCards[0].id).toBe('c1') // face-down, stale

    state = gameReducer(state, { type: 'REVEAL_CARD' })
    expect(state.currentTurn!.activeCards[0].id).toBe('c2') // swapped silently
    expect(state.deck[0]?.id).toBe('c1') // back on top, still unseen
  })
})

describe('voided words are burned', () => {
  it('records the spoken word and restores it on turn undo', () => {
    let state = playActions(config(), makeDeck(3), [
      { type: 'START_TURN' },
      { type: 'SELECT_CATEGORY', category: 'People' },
      { type: 'REVEAL_CARD' },
    ])
    const voided = state.currentTurn!.activeCards[0]
    state = gameReducer(state, { type: 'VOID_CARD', cardId: voided.id })
    expect(state.cardUsage[voided.id]).toContain('People')

    state = run(state, [{ type: 'TIMER_EXPIRED' }, { type: 'CONFIRM_TURN_END' }])
    expect(state.cardUsage[voided.id]).toContain('People')

    state = gameReducer(state, { type: 'UNDO' })
    expect(state.cardUsage[voided.id] ?? []).not.toContain('People')
  })
})

describe('chakra (☸) rounds', () => {
  const teamId = 'team-0'

  function playChakraRound(state: GameState): GameState {
    const s = gameReducer(state, { type: 'TRIGGER_CHAKRA' })
    const chosen = s.chakraState!.cards[0]
    return run(s, [
      { type: 'SELECT_CHAKRA_CARD', card: chosen },
      { type: 'CHAKRA_CORRECT', winningTeamId: teamId },
      { type: 'CONFIRM_CHAKRA_END' },
    ])
  }

  it('burns the played ☸ word and restores it on undo', () => {
    let state = playActions(config(), makeDeck(5), [])
    state = gameReducer(state, { type: 'TRIGGER_CHAKRA' })
    const chosen = state.chakraState!.cards[0]
    state = run(state, [
      { type: 'SELECT_CHAKRA_CARD', card: chosen },
      { type: 'CHAKRA_CORRECT', winningTeamId: teamId },
      { type: 'CONFIRM_CHAKRA_END' },
    ])
    // Every factory card's ☸ category is People.
    expect(state.cardUsage[chosen.id]).toContain('People')

    state = gameReducer(state, { type: 'UNDO' })
    expect(state.cardUsage[chosen.id] ?? []).not.toContain('People')
  })

  it('never re-offers a spent ☸ word while fresh ones exist', () => {
    let state = playActions(makeConfig({ maxActiveCards: 2, chakraCardCount: 2 }), makeDeck(5), [])
    state = playChakraRound(state)
    const spentId = state.turnHistory[0].usagePrev
      ? Object.keys(state.turnHistory[0].usagePrev)[0]
      : ''
    expect(spentId).not.toBe('')

    state = gameReducer(state, { type: 'TRIGGER_CHAKRA' })
    const offered = state.chakraState!.cards.map(c => c.id)
    expect(offered).toHaveLength(2)
    expect(offered).not.toContain(spentId)
  })

  it('pads the hand with oldest repeats once fresh ☸ words run short', () => {
    // 2 cards, hand of 2: play chakra rounds until both ☸ words are spent,
    // then the hand still offers 2 cards.
    let state = playActions(makeConfig({ maxActiveCards: 2, chakraCardCount: 2 }), makeDeck(2), [])
    state = playChakraRound(state)
    state = playChakraRound(state)
    state = gameReducer(state, { type: 'TRIGGER_CHAKRA' })
    expect(state.chakraState!.cards).toHaveLength(2)
  })
})

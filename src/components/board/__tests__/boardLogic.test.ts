import { stepPositions, isChakraSpace } from '../BoardTrack'
import { BOARD_SPACES, FINISH_INDEX, spaceAt } from '../../../constants/board'

describe('board layout', () => {
  it('is 7 cycles of 7 spaces plus FINISH', () => {
    expect(BOARD_SPACES).toHaveLength(50)
    expect(FINISH_INDEX).toBe(49)
    expect(BOARD_SPACES[FINISH_INDEX]).toEqual({ type: 'finish' })
  })

  it('spaceAt clamps out-of-range positions', () => {
    expect(spaceAt(-5)).toEqual(BOARD_SPACES[0])
    expect(spaceAt(999)).toEqual({ type: 'finish' })
  })

  it('isChakraSpace matches the ☸ spaces (index 2 of each cycle)', () => {
    expect(isChakraSpace(2)).toBe(true)
    expect(isChakraSpace(9)).toBe(true)
    expect(isChakraSpace(0)).toBe(false)
    expect(isChakraSpace(FINISH_INDEX)).toBe(false)
  })
})

describe('stepPositions (walk animation driver)', () => {
  it('moves each trailing piece forward one space', () => {
    expect(stepPositions([0, 5], [3, 5])).toEqual([1, 5])
  })

  it('snaps back instantly when a piece is past its target (undo)', () => {
    expect(stepPositions([4, 0], [2, 0])).toEqual([2, 0])
  })

  it('returns null when every piece is settled', () => {
    expect(stepPositions([3, 5], [3, 5])).toBeNull()
  })

  it('treats missing targets as 0', () => {
    expect(stepPositions([2], [])).toEqual([0])
  })
})

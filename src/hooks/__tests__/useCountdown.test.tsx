// =============================================================================
// hooks/__tests__/useCountdown.test.tsx
// Countdown behaviour under fake timers: ticking, expiry, reset.
// =============================================================================

import { renderHook, act } from '@testing-library/react-native'
import { useCountdown } from '../useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(0)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const advance = (ms: number) => act(async () => jest.advanceTimersByTime(ms))

  function renderCountdown(timerStartedAt: number | null, duration: number, onExpired: () => void) {
    return renderHook(
      ({ startedAt }: { startedAt: number | null }) =>
        useCountdown(startedAt, duration, onExpired),
      { initialProps: { startedAt: timerStartedAt } },
    )
  }

  it('shows the full duration while the timer has not started', async () => {
    const { result } = await renderCountdown(null, 60, jest.fn())
    expect(result.current).toBe(60)
  })

  it('counts down as time advances', async () => {
    const onExpired = jest.fn()
    const { result } = await renderCountdown(Date.now(), 60, onExpired)
    expect(result.current).toBe(60)

    await advance(10_000)
    expect(result.current).toBe(50)

    await advance(30_000)
    expect(result.current).toBe(20)
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('rounds partial seconds up so the display never skips ahead', async () => {
    const { result } = await renderCountdown(Date.now(), 60, jest.fn())
    await advance(500)
    expect(result.current).toBe(60) // 59.5 remaining → ceil → 60
    await advance(600)
    expect(result.current).toBe(59)
  })

  it('reaches 0 and fires onExpired exactly once', async () => {
    const onExpired = jest.fn()
    const { result } = await renderCountdown(Date.now(), 5, onExpired)

    await advance(5_000)
    expect(result.current).toBe(0)
    expect(onExpired).toHaveBeenCalledTimes(1)

    // Further ticks must not re-fire
    await advance(3_000)
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(result.current).toBe(0)
  })

  it('accounts for a timer that started in the past', async () => {
    const { result } = await renderCountdown(Date.now() - 40_000, 60, jest.fn())
    expect(result.current).toBe(20)
  })

  it('fires immediately when mounted with an already-expired timer', async () => {
    const onExpired = jest.fn()
    const { result } = await renderCountdown(Date.now() - 61_000, 60, onExpired)
    expect(result.current).toBe(0)
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('resets to the full duration when timerStartedAt becomes null', async () => {
    const onExpired = jest.fn()
    const { result, rerender } = await renderCountdown(Date.now(), 30, onExpired)
    await advance(10_000)
    expect(result.current).toBe(20)

    await rerender({ startedAt: null })
    expect(result.current).toBe(30)
  })

  it('restarts cleanly when timerStartedAt changes to a new timestamp', async () => {
    const onExpired = jest.fn()
    const { rerender } = await renderCountdown(Date.now(), 10, onExpired)

    await advance(10_000)
    expect(onExpired).toHaveBeenCalledTimes(1)

    // New turn: a fresh timer start must reset the fired flag and count again
    await rerender({ startedAt: Date.now() })
    await advance(10_000)
    expect(onExpired).toHaveBeenCalledTimes(2)
  })

  it('always uses the latest onExpired callback (no stale closure)', async () => {
    const first = jest.fn()
    const second = jest.fn()
    const startedAt = Date.now()
    const { rerender } = await renderHook(
      ({ cb }: { cb: () => void }) => useCountdown(startedAt, 5, cb),
      { initialProps: { cb: first } },
    )
    await rerender({ cb: second })
    await advance(5_000)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops ticking after unmount', async () => {
    const onExpired = jest.fn()
    const { unmount } = await renderCountdown(Date.now(), 5, onExpired)
    await unmount()
    await advance(10_000)
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('never returns a negative number', async () => {
    const { result } = await renderCountdown(Date.now() - 100_000, 10, jest.fn())
    expect(result.current).toBe(0)
    await advance(60_000)
    expect(result.current).toBe(0)
  })
})

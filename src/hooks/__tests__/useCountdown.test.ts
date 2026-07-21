import { renderHook, act } from '@testing-library/react-native'
import { useCountdown } from '../useCountdown'

// The hook reads Date.now() and runs a setInterval — modern fake timers
// advance both together, so advanceTimersByTime simulates real elapsed time.
// Note: RNTL v14 APIs are async (React 19) — renderHook/act must be awaited.
beforeEach(() => {
  jest.useFakeTimers()
})
afterEach(() => {
  jest.useRealTimers()
})

async function setup(startedAt: number | null, duration = 10) {
  const onExpired = jest.fn()
  const view = await renderHook(
    ({ ts }: { ts: number | null }) => useCountdown(ts, duration, onExpired),
    { initialProps: { ts: startedAt } },
  )
  return { view, onExpired }
}

const advance = (ms: number) => act(async () => jest.advanceTimersByTime(ms))

describe('useCountdown', () => {
  it('shows the full duration while the timer has not started', async () => {
    const { view, onExpired } = await setup(null)
    expect(view.result.current).toBe(10)
    await advance(5000)
    expect(view.result.current).toBe(10)
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('counts down in whole seconds once started', async () => {
    const { view } = await setup(Date.now())
    expect(view.result.current).toBe(10)
    await advance(3000)
    expect(view.result.current).toBe(7)
  })

  it('fires onExpired exactly once when reaching zero', async () => {
    const { view, onExpired } = await setup(Date.now())
    await advance(10_000)
    expect(view.result.current).toBe(0)
    expect(onExpired).toHaveBeenCalledTimes(1)
    await advance(5000)
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('accounts for time that passed before mount (backgrounded app)', async () => {
    // Timer started 4 seconds ago
    const { view } = await setup(Date.now() - 4000)
    expect(view.result.current).toBe(6)
  })

  it('resets when the timer is cleared', async () => {
    const { view } = await setup(Date.now())
    await advance(3000)
    expect(view.result.current).toBe(7)
    await view.rerender({ ts: null })
    expect(view.result.current).toBe(10)
  })

  it('restarts cleanly for a new turn', async () => {
    const { view, onExpired } = await setup(Date.now())
    await advance(10_000)
    expect(onExpired).toHaveBeenCalledTimes(1)

    await view.rerender({ ts: Date.now() }) // new turn, new start timestamp
    await advance(1000)
    expect(view.result.current).toBe(9)
    await advance(9000)
    expect(onExpired).toHaveBeenCalledTimes(2)
  })
})

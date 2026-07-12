// =============================================================================
// components/ui/__tests__/CountdownTimer.test.tsx
// Display formatting and live countdown rendering.
// =============================================================================

import { render, screen, act } from '@testing-library/react-native'
import { CountdownTimer } from '../CountdownTimer'

describe('CountdownTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(0)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const advance = (ms: number) => act(async () => jest.advanceTimersByTime(ms))

  it('formats durations over a minute as m:ss', async () => {
    await render(
      <CountdownTimer timerStartedAt={null} durationSeconds={90} onExpired={jest.fn()} />,
    )
    expect(screen.getByText('1:30')).toBeTruthy()
  })

  it('pads seconds in m:ss format', async () => {
    await render(
      <CountdownTimer timerStartedAt={null} durationSeconds={65} onExpired={jest.fn()} />,
    )
    expect(screen.getByText('1:05')).toBeTruthy()
  })

  it('shows bare seconds under a minute', async () => {
    await render(
      <CountdownTimer timerStartedAt={null} durationSeconds={45} onExpired={jest.fn()} />,
    )
    expect(screen.getByText('45')).toBeTruthy()
  })

  it('updates the display as the timer runs', async () => {
    await render(
      <CountdownTimer timerStartedAt={Date.now()} durationSeconds={30} onExpired={jest.fn()} />,
    )
    expect(screen.getByText('30')).toBeTruthy()
    await advance(12_000)
    expect(screen.getByText('18')).toBeTruthy()
  })

  it('reaches 0 and reports expiry', async () => {
    const onExpired = jest.fn()
    await render(
      <CountdownTimer timerStartedAt={Date.now()} durationSeconds={5} onExpired={onExpired} />,
    )
    await advance(5_000)
    expect(screen.getByText('0')).toBeTruthy()
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('shows exactly one minute as 1:00', async () => {
    await render(
      <CountdownTimer timerStartedAt={null} durationSeconds={60} onExpired={jest.fn()} />,
    )
    expect(screen.getByText('1:00')).toBeTruthy()
  })
})

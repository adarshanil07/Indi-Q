import { useEffect, useRef, useState } from 'react'

/**
 * Drives the turn countdown timer.
 *
 * Returns `secondsRemaining` (always an integer, min 0).
 * Calls `onExpired` exactly once when it first hits zero.
 * Resets automatically when `timerStartedAt` changes or becomes null.
 */
export function useCountdown(
  timerStartedAt: number | null,
  durationSeconds: number,
  onExpired: () => void,
): number {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds)
  // Keep a stable ref to the latest callback — avoids stale closure without
  // needing it as an effect dependency.
  const onExpiredRef = useRef(onExpired)
  const firedRef = useRef(false)

  useEffect(() => {
    onExpiredRef.current = onExpired
  })

  useEffect(() => {
    if (timerStartedAt === null) {
      setSecondsRemaining(durationSeconds)
      firedRef.current = false
      return
    }

    firedRef.current = false

    const tick = () => {
      const elapsed = (Date.now() - timerStartedAt) / 1000
      const remaining = Math.max(0, durationSeconds - elapsed)
      setSecondsRemaining(Math.ceil(remaining))

      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true
        onExpiredRef.current()
      }
    }

    tick() // fire immediately so the display is correct on first render
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [timerStartedAt, durationSeconds])

  return secondsRemaining
}

// =============================================================================
// components/ui/CountdownTimer.tsx
// The timer is a card row: a black-bordered band whose colour fill drains
// left-to-right as time runs out, stepping Nature-green → Movie-orange →
// Random-red (the deck's own colours), with big Baloo numerals inside.
//
// The fill glides continuously (not in one-second steps), and in the final
// five seconds the numerals get a heartbeat pulse.
// =============================================================================

import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { useCountdown } from '@/hooks/useCountdown'
import { CATEGORY_COLOURS } from '@/constants/categories'

interface Props {
  timerStartedAt: number | null
  durationSeconds: number
  onExpired: () => void
}

export function CountdownTimer({ timerStartedAt, durationSeconds, onExpired }: Props) {
  const secondsRemaining = useCountdown(timerStartedAt, durationSeconds, onExpired)

  const isRunning = timerStartedAt !== null
  const isWarning = secondsRemaining <= 10 && isRunning
  const isCritical = secondsRemaining <= 5 && isRunning

  // Continuous drain: one linear animation from the current fraction to 0
  // over exactly the remaining time. Resets to full while waiting.
  const fill = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (timerStartedAt === null) {
      fill.stopAnimation()
      fill.setValue(1)
      return
    }
    const elapsed = Date.now() - timerStartedAt
    const remainingMs = Math.max(0, durationSeconds * 1000 - elapsed)
    fill.setValue(remainingMs / (durationSeconds * 1000))
    Animated.timing(fill, {
      toValue: 0,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: false, // width animation
    }).start()
    return () => fill.stopAnimation()
  }, [timerStartedAt, durationSeconds, fill])

  // Heartbeat on the numerals in the final five seconds
  const beat = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!isCritical) {
      beat.stopAnimation()
      beat.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(500),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [isCritical, beat])

  const fillColour = isCritical
    ? CATEGORY_COLOURS.Random
    : isWarning
      ? CATEGORY_COLOURS.Movie
      : CATEGORY_COLOURS.Nature

  return (
    <View style={styles.band}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fillColour,
            width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
      <Animated.Text
        style={[
          styles.time,
          {
            transform: [
              { scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
            ],
          },
        ]}
      >
        {formatTime(secondsRemaining)}
      </Animated.Text>
    </View>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`
  return `${s}`
}

const styles = StyleSheet.create({
  band: {
    height: 54,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  time: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 28,
    color: '#000000',
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
})

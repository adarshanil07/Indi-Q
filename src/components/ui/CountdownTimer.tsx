import { StyleSheet, Text, View } from 'react-native'
import { useCountdown } from '@/hooks/useCountdown'
import { COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

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

  const displayTime = formatTime(secondsRemaining)
  const progress = secondsRemaining / durationSeconds

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.time,
          isWarning && styles.timeWarning,
          isCritical && styles.timeCritical,
        ]}
      >
        {displayTime}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.bar,
            {
              width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`,
              backgroundColor: isCritical
                ? COLOURS.danger
                : isWarning
                  ? COLOURS.skip
                  : COLOURS.correct,
            },
          ]}
        />
      </View>
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
  container: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  time: {
    fontSize: 56,
    fontWeight: '900',
    color: COLOURS.textPrimary,
    fontVariant: ['tabular-nums'],
    lineHeight: 60,
  },
  timeWarning: {
    color: COLOURS.skip,
  },
  timeCritical: {
    color: COLOURS.danger,
  },
  track: {
    width: '100%',
    height: 6,
    backgroundColor: COLOURS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
})

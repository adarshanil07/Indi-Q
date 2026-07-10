// =============================================================================
// components/ui/Pop.tsx
// Wraps children in a quick scale "pop" whenever `trigger` changes — the
// universal feedback for a number that just went up (scores, counters).
// Skips the first render so nothing pops on mount.
// =============================================================================

import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

interface Props {
  /** Pops each time this value changes. */
  trigger: unknown
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
}

export function Pop({ trigger, style, children }: Props) {
  const scale = useRef(new Animated.Value(1)).current
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    scale.setValue(1)
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.28, speed: 40, bounciness: 0, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
}

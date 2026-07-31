// =============================================================================
// components/ui/TeamScoreBar.tsx
// Team score chips in each team's identity colour (card-language: coloured
// fill, black border). The active team's chip is fully saturated with a
// heavier border; waiting teams fade back. Long-press a chip to edit its
// score manually (Section 6.7).
//
// When a target score is set, chips show "score / target" and any team
// within 2 points of winning gently pulses — the room can feel it coming.
// =============================================================================

import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { Team } from '@/types/game'
import { teamColourAt } from '@/constants/teams'
import { Pop } from './Pop'

interface Props {
  teams: Team[]
  activeTeamId: string
  /** No-board target score, if the game has one. */
  targetScore?: number
  onLongPressTeam?: (teamId: string) => void
}

export function TeamScoreBar({ teams, activeTeamId, targetScore, onLongPressTeam }: Props) {
  // One shared pulse driver for all near-target chips
  const pulse = useRef(new Animated.Value(0)).current
  const anyClose =
    targetScore !== undefined &&
    teams.some(t => targetScore - t.score <= 2 && t.score < targetScore)

  useEffect(() => {
    if (!anyClose) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [anyClose, pulse])

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })

  return (
    <View style={styles.container}>
      {teams.map((team, idx) => {
        const isActive = team.id === activeTeamId
        const isClose =
          targetScore !== undefined &&
          targetScore - team.score <= 2 &&
          team.score < targetScore
        const hasWon = targetScore !== undefined && team.score >= targetScore

        const chip = (
          <TouchableOpacity
            key={team.id}
            style={[
              styles.chip,
              { backgroundColor: teamColourAt(idx) },
              isActive ? styles.chipActive : styles.chipInactive,
            ]}
            onLongPress={() => onLongPressTeam?.(team.id)}
            delayLongPress={600}
            activeOpacity={0.8}
          >
            <Text style={styles.teamName} numberOfLines={1}>
              {hasWon ? '★ ' : ''}
              {team.name}
            </Text>
            <Pop trigger={team.score}>
              <Text style={styles.score}>
                {team.score}
                {targetScore !== undefined && (
                  <Text style={styles.target}>/{targetScore}</Text>
                )}
              </Text>
            </Pop>
          </TouchableOpacity>
        )

        // Near-target chips breathe; wrap in an animated scale
        if (isClose || hasWon) {
          return (
            <Animated.View key={team.id} style={[styles.pulseWrap, { transform: [{ scale: pulseScale }] }]}>
              {chip}
            </Animated.View>
          )
        }
        return chip
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  pulseWrap: {
    flex: 1,
    flexDirection: 'row',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    borderColor: '#000000',
    paddingHorizontal: 10,
    minHeight: 46,
    gap: 6,
  },
  chipActive: {
    borderWidth: 3,
  },
  chipInactive: {
    borderWidth: 2,
    opacity: 0.45,
  },
  teamName: {
    flex: 1,
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: '#000000',
  },
  score: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 20,
    color: '#000000',
    lineHeight: 26,
  },
  target: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: 13,
    color: 'rgba(0,0,0,0.55)',
  },
})

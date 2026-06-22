import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { Team } from '@/types/game'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

interface Props {
  teams: Team[]
  activeTeamId: string
  onLongPressTeam?: (teamId: string) => void
}

export function TeamScoreBar({ teams, activeTeamId, onLongPressTeam }: Props) {
  return (
    <View style={styles.container}>
      {teams.map(team => {
        const isActive = team.id === activeTeamId
        return (
          <TouchableOpacity
            key={team.id}
            style={[styles.teamPill, isActive && styles.teamPillActive]}
            onLongPress={() => onLongPressTeam?.(team.id)}
            delayLongPress={600}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.teamName, isActive && styles.teamNameActive]}
              numberOfLines={1}
            >
              {team.name}
            </Text>
            <Text style={[styles.score, isActive && styles.scoreActive]}>
              {team.score}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  teamPill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOURS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 44,
  },
  teamPillActive: {
    backgroundColor: COLOURS.textPrimary,
  },
  teamName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLOURS.textSecondary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  teamNameActive: {
    color: COLOURS.background,
  },
  score: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  scoreActive: {
    color: COLOURS.background,
  },
})

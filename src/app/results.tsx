import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useGame } from '@/store/GameContext'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'
import type { Team } from '@/types/game'

export default function ResultsScreen() {
  const { state } = useGame()
  const { teams } = state

  const sorted = [...teams].sort((a, b) => b.score - a.score)
  const topScore = sorted[0]?.score ?? 0
  const winners = sorted.filter(t => t.score === topScore)
  const isTie = winners.length > 1

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{isTie ? 'It\'s a Tie!' : 'Winner!'}</Text>
        <Text style={styles.heroName}>
          {winners.map(w => w.name).join(' & ')}
        </Text>
        <Text style={styles.heroScore}>{topScore} pts</Text>
      </View>

      <View style={styles.leaderboard}>
        <Text style={styles.leaderboardTitle}>Final Scores</Text>
        {sorted.map((team, idx) => (
          <ScoreRow key={team.id} team={team} rank={idx + 1} isWinner={team.score === topScore} />
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => router.replace('/setup')}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, styles.btnTextPrimary]}>Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => router.replace('/')}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function ScoreRow({ team, rank, isWinner }: { team: Team; rank: number; isWinner: boolean }) {
  return (
    <View style={[rowStyles.row, isWinner && rowStyles.rowWinner]}>
      <Text style={[rowStyles.rank, isWinner && rowStyles.rankWinner]}>#{rank}</Text>
      <Text style={[rowStyles.name, isWinner && rowStyles.nameWinner]} numberOfLines={1}>
        {team.name}
      </Text>
      <Text style={[rowStyles.score, isWinner && rowStyles.scoreWinner]}>{team.score}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.background,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  hero: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  heroLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLOURS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroName: {
    fontSize: 40,
    fontWeight: '900',
    color: COLOURS.textPrimary,
    textAlign: 'center',
  },
  heroScore: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLOURS.correct,
  },
  leaderboard: {
    flex: 1,
    gap: SPACING.sm,
  },
  leaderboardTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLOURS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  actions: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  btn: {
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: COLOURS.textPrimary,
  },
  btnSecondary: {
    backgroundColor: COLOURS.surface,
  },
  btnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  btnTextPrimary: {
    color: COLOURS.background,
  },
  btnTextSecondary: {
    color: COLOURS.textPrimary,
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOURS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  rowWinner: {
    backgroundColor: COLOURS.textPrimary,
  },
  rank: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLOURS.textSecondary,
    width: 28,
  },
  rankWinner: {
    color: 'rgba(255,255,255,0.6)',
  },
  name: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLOURS.textPrimary,
  },
  nameWinner: {
    color: COLOURS.background,
    fontWeight: '700',
  },
  score: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  scoreWinner: {
    color: COLOURS.background,
  },
})

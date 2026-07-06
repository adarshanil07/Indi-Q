// =============================================================================
// app/completed.tsx
// Completed Words — grouped by round. Each round is a box with a header
// (vector category box + category name + team name) followed by the words
// guessed in that round.
// =============================================================================

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { router } from 'expo-router'
import { useGame } from '@/store/GameContext'
import { CATEGORY_BOX_SVGS } from '@/constants/cardSvg'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'
import type { Category, CompletedWord } from '@/types/game'

interface RoundGroup {
  key: string
  category: Category
  teamId: string
  isChakra: boolean
  words: CompletedWord[]
}

/** Collapse the chronological word log into per-round groups. */
function groupByRound(words: CompletedWord[]): RoundGroup[] {
  const groups: RoundGroup[] = []
  for (const w of words) {
    const last = groups[groups.length - 1]
    const sameRound =
      last &&
      last.words[0].round === w.round &&
      last.teamId === w.teamId &&
      last.isChakra === !!w.isChakra &&
      last.category === w.category
    if (sameRound) {
      last.words.push(w)
    } else {
      groups.push({
        key: `${w.round}-${w.teamId}-${w.isChakra ? 'chakra' : 'turn'}-${groups.length}`,
        category: w.category,
        teamId: w.teamId,
        isChakra: !!w.isChakra,
        words: [w],
      })
    }
  }
  return groups
}

export default function CompletedWordsScreen() {
  const { state } = useGame()
  const { completedWords, teams } = state

  const teamName = (teamId: string) => teams.find(t => t.id === teamId)?.name ?? '—'

  // Newest round first
  const groups = groupByRound(completedWords).reverse()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back to game</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Completed Words</Text>
          <Text style={styles.count}>{completedWords.length}</Text>
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No words completed yet</Text>
          <Text style={styles.emptySub}>Correctly guessed words will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {groups.map(group => (
            <RoundBox key={group.key} group={group} teamName={teamName(group.teamId)} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function RoundBox({ group, teamName }: { group: RoundGroup; teamName: string }) {
  return (
    <View style={boxStyles.box}>
      {/* Round header: vector category box + category + team */}
      <View style={boxStyles.headerRow}>
        <SvgXml xml={CATEGORY_BOX_SVGS[group.category]} width={30} height={30} />
        <Text style={boxStyles.category}>
          {group.isChakra ? '☸ Chakra' : group.category}
        </Text>
        <Text style={boxStyles.team} numberOfLines={1}>
          {teamName}
        </Text>
      </View>

      <View style={boxStyles.divider} />

      {/* Words guessed this round */}
      {group.words.map((w, idx) => (
        <View key={`${w.cardId}-${idx}`} style={boxStyles.wordRow}>
          <Text style={boxStyles.word} numberOfLines={1}>
            {w.word}
          </Text>
          {w.wordMl != null && (
            <Text style={boxStyles.wordMl} numberOfLines={1}>
              {w.wordMl}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.background,
    paddingHorizontal: SPACING.xl,
  },
  header: {
    paddingTop: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  back: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textSecondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  count: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLOURS.textSecondary,
  },
  list: {
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLOURS.textPrimary,
  },
  emptySub: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textSecondary,
  },
})

const boxStyles = StyleSheet.create({
  box: {
    backgroundColor: COLOURS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  category: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  team: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLOURS.textSecondary,
    maxWidth: 140,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E2E2',
    marginVertical: SPACING.xs,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  word: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: FONT_SIZE.md,
    color: COLOURS.textPrimary,
    flexShrink: 1,
  },
  wordMl: {
    fontFamily: 'BalooChettan2_500Medium',
    fontSize: FONT_SIZE.sm,
    color: COLOURS.textSecondary,
    flexShrink: 1,
  },
})

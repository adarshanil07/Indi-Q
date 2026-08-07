// =============================================================================
// app/results.tsx — Final scores
// Indi-Q card theme: the winner's name sits in a band of their own team
// colour; leaderboard rows carry each team's identity chip.
// =============================================================================

import { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { AdBanner, useGameEndInterstitial } from '@/ads'
import { INTERSTITIAL_DELAY_MS } from '@/ads/config'
import { useGame } from '@/store/GameContext'
import { BRAND_COLOURS } from '@/constants/brandAssets'
import { CATEGORY_COLOURS } from '@/constants/categories'
import { teamColourFor } from '@/constants/teams'
import type { Team } from '@/types/game'

const CREAM = BRAND_COLOURS.cream
const INK = BRAND_COLOURS.ink
const HINT = BRAND_COLOURS.hint

export default function ResultsScreen() {
  const { state } = useGame()
  const { teams, config, boardPositions } = state

  // Board games rank by how far each piece travelled; otherwise by score.
  const boardMode = config.boardMode
  const valueOf = (t: Team) =>
    boardMode ? boardPositions[teams.findIndex(x => x.id === t.id)] ?? 0 : t.score

  const sorted = [...teams].sort((a, b) => valueOf(b) - valueOf(a))
  const topScore = sorted.length ? valueOf(sorted[0]) : 0
  const winners = sorted.filter(t => valueOf(t) === topScore)
  const isTie = winners.length > 1

  // Winner announcement springs in rather than just appearing
  const heroIn = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(heroIn, {
      toValue: 1,
      friction: 5,
      tension: 90,
      delay: 150,
      useNativeDriver: true,
    }).start()
  }, [heroIn])

  // End-of-game interstitial. Held back until the winner has landed and the
  // confetti has had a moment — slamming an ad over the celebration is the
  // fastest way to make winning feel bad. Cleared on unmount so a quick tap
  // on Play Again never drops the ad onto the next screen.
  const { show: showInterstitial } = useGameEndInterstitial()
  useEffect(() => {
    const timer = setTimeout(showInterstitial, INTERSTITIAL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [showInterstitial])

  return (
    <SafeAreaView style={styles.container}>
      <Confetti />
      <AdBanner />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroIn,
              transform: [
                { scale: heroIn.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            },
          ]}
        >
          <Text style={styles.heroLabel}>{isTie ? "It's a Tie!" : 'Winner!'}</Text>

          {isTie ? (
            /* Tie: one compact band holding every tied team's chip + name */
            <View style={styles.tieBand}>
              {winners.map(w => (
                <View key={w.id} style={styles.tieEntry}>
                  <View
                    style={[styles.tieChip, { backgroundColor: teamColourFor(teams, w.id) }]}
                  />
                  <Text style={styles.tieName} numberOfLines={1}>
                    {w.name}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            /* Single winner: full-size band in the winner's colour */
            <View
              style={[
                styles.winnerBand,
                { backgroundColor: teamColourFor(teams, winners[0].id) },
              ]}
            >
              <Text
                style={styles.winnerBandText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {winners[0].name}
              </Text>
            </View>
          )}

          <Text style={styles.heroScore}>
            {boardMode ? `Space ${topScore + 1}` : `${topScore} pts`}
          </Text>
        </Animated.View>

        <View style={styles.leaderboard}>
          <Text style={styles.leaderboardTitle}>Final Scores</Text>
          {sorted.map((team, idx) => (
            <ScoreRow
              key={team.id}
              team={team}
              rank={idx + 1}
              value={boardMode ? `${valueOf(team) + 1}` : `${team.score}`}
              colour={teamColourFor(teams, team.id)}
              isWinner={valueOf(team) === topScore}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
          onPress={() => router.replace('/setup')}
        >
          <Text style={styles.btnPrimaryText}>Play Again</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.btnSecondaryText}>Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

// ── Confetti ────────────────────────────────────────────────────────────────
// A one-shot celebration: small squares in the deck's six colours fall from
// the top of the screen with random drift and spin. Pure Animated — no deps.

const CONFETTI_COLOURS = Object.values(CATEGORY_COLOURS)
const CONFETTI_COUNT = 18

function Confetti() {
  const { width: W, height: H } = useWindowDimensions()

  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        x: Math.random() * W,
        drift: (Math.random() - 0.5) * 120,
        size: 8 + Math.random() * 8,
        colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
        delay: Math.random() * 500,
        duration: 1400 + Math.random() * 900,
        spin: Math.random() < 0.5 ? '-540deg' : '540deg',
      })),
    [W],
  )

  const progress = useRef(pieces.map(() => new Animated.Value(0))).current

  useEffect(() => {
    Animated.stagger(
      40,
      progress.map((p, i) =>
        Animated.timing(p, {
          toValue: 1,
          duration: pieces[i].duration,
          delay: pieces[i].delay,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: piece.x,
            top: -20,
            width: piece.size,
            height: piece.size,
            borderRadius: 2,
            backgroundColor: piece.colour,
            opacity: progress[i].interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [1, 1, 0],
            }),
            transform: [
              {
                translateY: progress[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, H + 40],
                }),
              },
              {
                translateX: progress[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, piece.drift],
                }),
              },
              {
                rotate: progress[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', piece.spin],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  )
}

function ScoreRow({
  team,
  rank,
  value,
  colour,
  isWinner,
}: {
  team: Team
  rank: number
  value: string
  colour: string
  isWinner: boolean
}) {
  return (
    <View style={[rowStyles.row, isWinner && rowStyles.rowWinner]}>
      <Text style={rowStyles.rank}>#{rank}</Text>
      <View style={[rowStyles.chip, { backgroundColor: colour }]} />
      <Text style={rowStyles.name} numberOfLines={1}>
        {team.name}
      </Text>
      <Text style={rowStyles.score}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 24,
    paddingBottom: 12,
  },
  hero: {
    alignItems: 'stretch',
    gap: 14,
    paddingVertical: 12,
  },
  tieBand: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 20,
    rowGap: 10,
  },
  tieEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  tieChip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },
  tieName: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 20,
    color: '#000000',
    lineHeight: 28,
    flexShrink: 1,
  },
  heroLabel: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: HINT,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  winnerBand: {
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  winnerBandText: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 36,
    color: '#000000',
    // Deliberately no explicit line height — see teamBandText in game.tsx.
  },
  heroScore: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 24,
    color: INK,
    textAlign: 'center',
    lineHeight: 32,
  },
  leaderboard: {
    gap: 10,
  },
  leaderboardTitle: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: HINT,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#000000',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: BRAND_COLOURS.orange,
    shadowColor: '#7a4a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
  },
  btnPrimaryText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 19,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  btnSecondaryText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 17,
    color: INK,
  },
  pressed: {
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowWinner: {
    borderWidth: 3,
  },
  rank: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 13,
    color: HINT,
    width: 26,
  },
  chip: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },
  name: {
    flex: 1,
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: INK,
  },
  score: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 24,
    color: INK,
    lineHeight: 32,
  },
})

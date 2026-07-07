// =============================================================================
// app/how-to-play.tsx — How to Play
// Rules screen dressed in the INDI-Q brand: the orange backdrop from Home,
// brand typography, and the physical card's rules back — recreated from the
// vectorized card assets — sitting front and centre. Each rule below it is a
// white card bulleted with one of the hand-vectorized category squares, so the
// whole screen reads as part of the same deck.
// =============================================================================

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { SvgXml } from 'react-native-svg'
import { Chakra } from '@/components/card/Chakra'
import { HowToPlayCard } from '@/components/card/HowToPlayCard'
import { BRAND_COLOURS } from '@/constants/brandAssets'
import { CATEGORIES } from '@/constants/categories'
import { CATEGORY_BOX_SVGS } from '@/constants/cardSvg'
import { BORDER_RADIUS, SPACING } from '@/constants/theme'

const RULES = [
  { heading: 'Objective', body: 'Be the first team to reach the target score, or accumulate the most points when the game ends.' },
  { heading: 'Taking a Turn', body: 'The describer taps the blurred card to reveal it. They must describe the word in the active category — without saying the word or any part of it — while their teammates guess.' },
  { heading: 'Scoring', body: 'Tap Correct whenever your team guesses a word. Each correct guess scores one point.' },
  { heading: 'Skip', body: 'If your team is stuck, tap Skip to push the card aside and draw a fresh one. You can have up to the configured number of cards on screen at once. Skipping does not cost a point.' },
  { heading: 'Void', body: 'If the describer accidentally says the word, tap Void. The card is darkened and cannot be scored.' },
  { heading: 'Timer', body: 'The countdown starts as soon as you reveal the card. When it hits zero, the cards are hidden again — you have a brief moment to log any last-second correct guess before confirming the end of the round.' },
  { heading: 'Chakra Round', body: 'Instead of a normal turn, the active team can start a Chakra Round. The describer picks one of several cards and describes its Chakra word (marked with the ☸ symbol) while every team guesses. The first team to guess it wins the reward chosen during setup — bonus points or an extra round.' },
  { heading: 'Restart', body: 'False start? Tap Restart during a turn to discard the cards on screen and begin again with a fresh card and a full timer. Points already scored are kept.' },
  { heading: 'Undo', body: 'Made a mistake on the last completed turn? Tap Undo to reverse it.' },
]

export default function HowToPlayScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>How to Play</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* The rules back of the physical card, rebuilt from the vectorized assets */}
        <HowToPlayCard />
        <Text style={styles.cardCaption}>Straight from the box — the back of every INDI-Q card</Text>

        {RULES.map((rule, i) => (
          <View key={rule.heading} style={styles.rule}>
            <View style={styles.ruleHeadingRow}>
              {/* Vectorized category squares double as rule bullets; the
                  Chakra Round rule gets the vectorized Chakra itself */}
              {rule.heading === 'Chakra Round' ? (
                <Chakra size={24} bgColor="#FFFFFF" />
              ) : (
                <SvgXml
                  xml={CATEGORY_BOX_SVGS[CATEGORIES[i % CATEGORIES.length]]}
                  width={22}
                  height={22}
                />
              )}
              <Text style={styles.ruleHeading}>{rule.heading}</Text>
            </View>
            <Text style={styles.ruleBody}>{rule.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLOURS.orange,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    paddingTop: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  backText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  title: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 34,
    color: '#FFFFFF',
  },
  scroll: {
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  cardCaption: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  rule: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
    shadowColor: '#7a4a00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  ruleHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ruleHeading: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 17,
    color: BRAND_COLOURS.ink,
  },
  ruleBody: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: 15,
    color: '#444444',
    lineHeight: 22,
  },
})

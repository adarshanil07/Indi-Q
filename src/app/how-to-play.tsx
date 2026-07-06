import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

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
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>How to Play</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {RULES.map(rule => (
          <View key={rule.heading} style={styles.rule}>
            <Text style={styles.ruleHeading}>{rule.heading}</Text>
            <Text style={styles.ruleBody}>{rule.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOURS.background, paddingHorizontal: SPACING.xl },
  header: { paddingTop: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  back: { fontSize: FONT_SIZE.md, color: COLOURS.textSecondary },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLOURS.textPrimary },
  scroll: { gap: SPACING.lg, paddingBottom: SPACING.xxl },
  rule: { gap: SPACING.xs },
  ruleHeading: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLOURS.textPrimary },
  ruleBody: { fontSize: FONT_SIZE.md, color: COLOURS.textSecondary, lineHeight: 24 },
})

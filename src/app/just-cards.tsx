import { useState } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { GameCard } from '@/components/card/GameCard'
import type { Card } from '@/types/game'
import rawCards from '../data/cards.json'

const ALL_CARDS = rawCards as Card[]

// Must match aspectRatio in GameCard — physical card is 703×502 (landscape)
const CARD_ASPECT = 703 / 502

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function JustCardsScreen() {
  const [deck, setDeck] = useState<Card[]>(() => shuffled(ALL_CARDS))
  const [index, setIndex] = useState(0)
  // Measured size of the flexible card area after layout
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 })

  const card = deck[index]
  const isFirst = index === 0
  const isLast = index === deck.length - 1

  // Fit card within the card area while keeping the aspect ratio intact.
  // If the area is taller than wide, constrain by width; if wider than tall,
  // constrain by height so the card doesn't overflow downward.
  const cardWidth =
    areaSize.h > 0
      ? Math.min(areaSize.w, areaSize.h * CARD_ASPECT)
      : 0

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setAreaSize({ w: width, h: height })
  }

  const goNext = () => {
    if (isLast) {
      setDeck(shuffled(ALL_CARDS))
      setIndex(0)
    } else {
      setIndex(i => i + 1)
    }
  }

  const goPrev = () => {
    if (!isFirst) setIndex(i => i - 1)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar — fixed height so it doesn't eat into card space */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>
          {index + 1}
          <Text style={styles.counterOf}> / {deck.length}</Text>
        </Text>
      </View>

      {/* Card area — takes all remaining vertical space */}
      <View style={styles.cardArea} onLayout={onAreaLayout}>
        {cardWidth > 0 && (
          <View style={{ width: cardWidth }}>
            <GameCard
              card={card}
              isRevealed={true}
              isVoided={false}
              selectedCategory={null}
            />
          </View>
        )}
      </View>

      {/* Navigation — fixed height */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
          onPress={goPrev}
          disabled={isFirst}
          activeOpacity={0.8}
        >
          <Text style={[styles.navArrow, isFirst && styles.navArrowDisabled]}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, isLast && styles.navBtnReshuffle]}
          onPress={goNext}
          activeOpacity={0.8}
        >
          <Text style={styles.navArrow}>{isLast ? '↺' : '→'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const NAV_BTN = 72

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },

  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
  },
  counter: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 22,
    color: '#111111',
  },
  counterOf: {
    fontFamily: 'BalooChettan2_700Bold',
    color: '#999999',
  },

  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  nav: {
    height: NAV_BTN + 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  navBtn: {
    width: NAV_BTN,
    height: NAV_BTN,
    borderRadius: NAV_BTN / 2,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  navBtnDisabled: {
    backgroundColor: '#DDDDDD',
    shadowOpacity: 0,
    elevation: 0,
  },
  navBtnReshuffle: {
    backgroundColor: '#33A44F',
  },
  navArrow: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 30,
    color: '#FFFFFF',
    lineHeight: 36,
  },
  navArrowDisabled: {
    color: '#AAAAAA',
  },
})

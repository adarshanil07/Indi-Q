// =============================================================================
// app/index.tsx — Home
// The INDI-Q brand screen IS the home screen: orange backdrop, corner
// ornaments hugging the real screen edges, the golden mandala slowly turning
// behind the logo, and the menu beneath. The intro's circular reveal lands
// directly on this screen, so the end of the intro is the home screen.
//
// Layout rules (hold on any aspect ratio):
//   • Logo centre sits at 47% of screen height (optically centred once the
//     menu weight below is accounted for).
//   • The mandala is centred on the logo and sized as
//       min(2.1 × logoW, largest size whose edges stay clear of BOTH
//       ornament strips) — overlap with the ornaments is geometrically
//       impossible on any screen.
//   • The menu's bottom edge sits above the bottom ornament cluster so the
//     buttons overlap the mandala's lower arc, not the ornaments. If a short
//     screen leaves too little room between logo and menu, the menu slides
//     down (allowed to overlap the ornaments) rather than shrinking.
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { BRAND_AR, BRAND_ASSETS, BRAND_COLOURS } from '@/constants/brandAssets'

const SPIN_PERIOD_MS = 36000 // slow, ambient — noticeable only if you watch
const EDGE_GAP = 16          // minimum clearance between mandala and ornaments
const LOGO_MENU_GAP = 24     // minimum clearance between logo and menu

export default function HomeScreen() {
  const { width: W, height: H } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [menuH, setMenuH] = useState(190) // refined by onLayout on first pass

  // Ambient mandala rotation (native driver — runs off the JS thread)
  const spin = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_PERIOD_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [spin])
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  // ── Layout ────────────────────────────────────────────────────────
  const logoW = Math.min(W * 0.62, 340)
  const logoH = logoW / BRAND_AR.logo
  const logoCenterY = H * 0.47

  const borderTopH = W / BRAND_AR.borderTop
  const borderBottomH = W / BRAND_AR.borderBottom

  // Mandala: as large as the design wants (2.1 × logo), but never so large
  // that it reaches either ornament strip. mandala half-height = 0.489 × W.
  const topClear = logoCenterY - borderTopH - EDGE_GAP
  const bottomClear = H - logoCenterY - borderBottomH - EDGE_GAP
  const clearance = Math.max(100, Math.min(topClear, bottomClear))
  const mandalaW = Math.min(logoW * 2.1, (clearance * 2) / (1 / BRAND_AR.mandala))
  const mandalaH = mandalaW / BRAND_AR.mandala

  // Menu: prefer sitting just above the bottom ornament cluster (buttons
  // overlap the mandala, not the ornaments). On short screens keep the menu
  // full-size and let it slide down over the ornaments instead.
  const logoBottom = logoCenterY + logoH / 2
  let menuBottom = borderBottomH + 8
  const menuTopAtPreferred = H - menuBottom - menuH
  if (menuTopAtPreferred < logoBottom + LOGO_MENU_GAP) {
    menuBottom = H - (logoBottom + LOGO_MENU_GAP) - menuH
  }
  menuBottom = Math.max(menuBottom, insets.bottom + 16)

  const onMenuLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height)
    if (h > 0 && h !== menuH) setMenuH(h)
  }

  return (
    <View style={styles.root}>
      {/* Spinning mandala — ambient backdrop centred on the logo */}
      <Animated.Image
        source={BRAND_ASSETS.iqMandala}
        style={{
          position: 'absolute',
          left: W / 2 - mandalaW / 2,
          top: logoCenterY - mandalaH / 2,
          width: mandalaW,
          height: mandalaH,
          transform: [{ rotate: spinDeg }],
        }}
        resizeMode="contain"
      />

      {/* Corner ornaments pinned to the real screen edges */}
      <Image
        source={BRAND_ASSETS.iqBorderTop}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: borderTopH }}
        resizeMode="contain"
      />
      <Image
        source={BRAND_ASSETS.iqBorderBottom}
        style={{ position: 'absolute', bottom: 0, left: 0, width: W, height: borderBottomH }}
        resizeMode="contain"
      />

      {/* INDI-Q logo */}
      <Image
        source={BRAND_ASSETS.iqLogo}
        style={{
          position: 'absolute',
          left: W / 2 - logoW / 2,
          top: logoCenterY - logoH / 2,
          width: logoW,
          height: logoH,
        }}
        resizeMode="contain"
      />

      {/* Menu — overlaps the mandala's lower arc, clear of the ornaments */}
      <View style={[styles.menu, { bottom: menuBottom }]} onLayout={onMenuLayout}>
        <MenuButton label="Just Cards" onPress={() => router.push('/just-cards')} />
        <MenuButton label="Full Game" onPress={() => router.push('/setup')} />
        <View style={styles.secondaryRow}>
          <SecondaryButton label="How to Play" onPress={() => router.push('/how-to-play')} />
          <SecondaryButton label="Settings" onPress={() => router.push('/settings')} />
        </View>
      </View>
    </View>
  )
}

function MenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuBtn} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.menuBtnText}>{label}</Text>
    </TouchableOpacity>
  )
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.secondaryBtn} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND_COLOURS.orange,
  },
  menu: {
    position: 'absolute',
    // No left/right: horizontal placement falls back to flexbox, so
    // alignSelf centres the capped-width menu on wide screens.
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
    paddingHorizontal: 28,
    gap: 14,
  },
  menuBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#7a4a00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  menuBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 19,
    color: BRAND_COLOURS.ink,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 2,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
})

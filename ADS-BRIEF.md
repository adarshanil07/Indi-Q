# Indi-Q — Ads Implementation Brief & Context Handoff

**Baseline:** `origin/main` @ `dd57e62` (verified against this commit, not an older branch)
**Purpose:** Everything a fresh session needs to implement ads in Indi-Q, plus context discovered during research that isn't obvious from the code.

> **Read this first:** every "current state" claim below was verified against `origin/main` by inspecting files, hashing assets, and querying the npm registry. Where something is a recommendation rather than a fact, it says so.

---

## 1. Locked product decisions

These were decided by the app owner. Don't relitigate them.

| Decision | Choice | Consequence |
|---|---|---|
| Apple account | **Individual** (£99/yr) | Owner's legal name is the public seller. No D-U-N-S needed. |
| Platforms | **iOS + Android, launching together** | Google Play is $25 one-time. Both store listings needed. |
| Ads in v1.0? | **Yes — ads ship in the first release** | Full consent/ATT/privacy surface must be right on first submission. |
| Audience | **Family-friendly, but NOT Apple's Kids Category** | Keeps ad flexibility. Requires specific Play Console settings — see §5.3. |

**Ad formats wanted:**
- Interstitial (full-screen) at the end of each game.
- Banner at the bottom of the app on *some* screens.

> ⚠️ **Correct a misconception if it comes up:** you cannot specify "a 30-second ad." Ad length is set by the advertiser (typically 5–30s, with a close button after a few seconds). If a guaranteed longer, watched ad is wanted, that's a **rewarded** ad — which Google requires to be opt-in with an explicit reward.

---

## 2. Verified current state of `main`

### Already done (do not redo)

- ✅ **Bundle identifiers set** — `com.enjoygames.indiq` for both `ios.bundleIdentifier` and `android.package`.
- ✅ **`eas.json` exists** with `development` / `preview` / `production` profiles, `appVersionSource: "remote"`.
- ✅ **EAS project linked** — `extra.eas.projectId: aa1ffb50-1687-4afa-a2ce-c2e8e802319d`.
- ✅ **App icon replaced** — `assets/images/icon.png` hashes to `ddc5cef4…`, which is *not* the Expo default (`8d892ef0…`). The old Expo `.icon` bundle reference is gone from `app.json`.
- ✅ **Adaptive icon** background is brand orange `#FF9B00`.
- ✅ **Jest configured** with a `jest.setup.js` that already mocks AsyncStorage, safe-area-context, and `@react-native-community/slider`. **This file is where the AdMob mock belongs.**
- ✅ **Board Mode is implemented** (`src/components/board/BoardTrack.tsx`, `src/constants/board.ts`).

### Screens that exist on main

```
src/app/_layout.tsx      Root: fonts, GameProvider, Stack, IntroSequence overlay
src/app/index.tsx        Home (branded orange, spinning mandala, menu)
src/app/setup.tsx        Game setup
src/app/game.tsx         Active play + board + Chakra + modals
src/app/results.tsx      End-of-game scores
src/app/completed.tsx    Completed Words
src/app/how-to-play.tsx  Rules
src/app/settings.tsx     ⚠️ still a placeholder ("Settings coming soon")
src/app/just-cards.tsx   Card browser
```

### Relevant components

`ui/LanguageToggle.tsx` (EN | മ pill, persists via `utils/prefs.ts`) · `ui/Pop.tsx` · `ui/CountdownTimer.tsx` · `card/CardStack.tsx` · `card/GameCard.tsx` · `card/Chakra.tsx` (**an SVG Chakra wheel — important, see §6.2**) · `chakra/ChakraRound.tsx` · `board/BoardTrack.tsx` · `card/HowToPlayCard.tsx`

### Dependency notes

`react-native-svg@15.15.4` is **already a dependency** — use it for icons rather than adding an icon library.

Six packages have **zero references** in `src/` on main: `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-device`, `expo-web-browser`, `expo-image`. These are safe removal candidates.

> ⚠️ **Do NOT remove** `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `react-native-screens`, `react-native-safe-area-context`, `expo-constants`, or `expo-linking` — they also show zero direct imports but are pulled in transitively by `expo-router`. Removing them breaks navigation.

---

## 3. The ads stack

### 3.1 Package choice — settled

```bash
npx expo install react-native-google-mobile-ads expo-tracking-transparency
```

- **`react-native-google-mobile-ads@16.4.0`** — published 2026-06-25, actively maintained, ships an Expo config plugin. `peerDependencies: { expo: ">=47.0.0" }`. Bundles Google Mobile Ads **iOS 13.5.0 / Android 25.4.0** and the UMP consent SDK (iOS 3.1.0 / Android 4.0.0). Android `minSdk 23`, `targetSdk 34`.
- **`expo-tracking-transparency@~56.0.5`** — iOS ATT prompt. Required because AdMob touches the IDFA.

> ❌ **`expo-ads-admob` is dead.** Last published v13.0.0 in **April 2022** and removed from Expo in SDK 46. If any doc or answer suggests it, it's out of date.

### 3.2 The workflow cost — flag this to the owner before starting

AdMob is native code. **Adding it ends the Expo Go workflow.** From that point on, development requires an EAS development build:

```bash
eas build --profile development --platform android   # or ios
```

The `development` profile already exists in `eas.json`. Budget time for this transition — it's the single biggest practical disruption of this feature.

### 3.3 `app.json` changes

Add to the `plugins` array (which currently holds `expo-router` and `expo-splash-screen`):

```jsonc
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-XXXXXXXX~YYYYYYYY",
    "iosAppId": "ca-app-pub-XXXXXXXX~ZZZZZZZZ"
  }
],
[
  "expo-tracking-transparency",
  {
    "userTrackingUsageDescription": "This lets us show ads that are more relevant to you."
  }
]
```

The AdMob **app IDs** (`~` separator) are different from **ad unit IDs** (`/` separator). Both come from the AdMob console.

---

## 4. Implementation design

### 4.1 Wrap the SDK — do not import it directly in screens

```
src/ads/
  index.ts            Public API: AdsProvider, useAds, AdBanner
  AdsProvider.tsx     Init, consent, interstitial preload/show, adsEnabled flag
  AdBanner.tsx        Returns null when ads are disabled
  adUnits.ts          Google test IDs in __DEV__, real IDs in production
  __mocks__/gma.ts    Jest stub
```

Two reasons this matters:

1. **Tests.** Screens that import the SDK directly will break the existing suite. Add the mock to the existing **`jest.setup.js`** (it already mocks three native modules the same way) rather than inventing a new mechanism.
2. **Expo Go.** A runtime guard (`Constants.appOwnership === 'expo'` → no-op stubs) keeps the app bootable in Expo Go for non-ad work.

### 4.2 Always use test ad units in development

Google publishes universal test ad unit IDs. **Clicking your own live ads is the fastest way to get an AdMob account permanently banned.** Gate on `__DEV__`.

### 4.3 Banner placement map — specific to main

| Screen | Banner? | Reasoning |
|---|---|---|
| `how-to-play.tsx` | ✅ Yes | Passive, scrollable, no time pressure. |
| `settings.tsx` | ✅ Yes | Passive. Also the natural home for Remove Ads + privacy policy link. |
| `completed.tsx` | ✅ Yes | Passive review screen. |
| `results.tsx` | ✅ Yes | Below the leaderboard, above Play Again / Home. |
| **`game.tsx`** | ❌ **NEVER** | See below — this is the account-safety rule. |
| `index.tsx` (Home) | ⚠️ Not without rework | See below. |
| `just-cards.tsx` | ⚠️ Discouraged | 72px nav circles sit at the bottom; a banner crowds repeated tap targets and squeezes the `flex: 1` card area. |
| `setup.tsx` | ⚠️ Optional | Long scrolling form. Acceptable, but it's a pre-game screen users pass through quickly. |

**Why never on `game.tsx`:** the bottom of that screen carries Correct / Void / Skip and End Turn, tapped rapidly under a running countdown, plus the board and Chakra flows. A banner there is an accidental-click generator. Accidental clicks are **invalid traffic**, and invalid traffic gets AdMob accounts **suspended**. This is the highest-stakes rule in this document.

**Why Home needs rework:** `index.tsx` computes its entire layout from `useWindowDimensions().height` — logo centre at `H * 0.47`, mandala sized against ornament clearance, and `menuBottom` derived from `borderBottomH` — with the ornament strips pinned to the true screen edges (`bottom: 0`). A banner overlaps the bottom ornament cluster. Making it work means threading the banner height through that geometry, not dropping a component in.

**Banner spec:** use `BannerAdSize.ANCHORED_ADAPTIVE_BANNER` and reserve its height in the layout so content doesn't jump when the ad fills.

### 4.4 Interstitial — anchor points on main

`results.tsx` has exactly two exits, both `Pressable`:

```tsx
onPress={() => router.replace('/setup')}   // "Play Again"
onPress={() => router.replace('/')}        // "Home"
```

**Recommended: fire the interstitial on these two presses, not on `results.tsx` mount.**

The winner reveal is the emotional payoff of the whole game; covering it with a full-screen ad is the most-complained-about pattern in party games. Firing on exit is a natural transition, matches Google's own placement guidance, and yields the same impression count.

*(The owner originally asked for "at the end of each game." Exit-of-results is still the end of each game — just one beat later. Raise it, but it's their call.)*

**Preload early.** Interstitials take seconds to fetch; an unloaded one silently doesn't show. Call `.load()` when the game starts (game phase becomes `playing`), so it's warm by the time results appear.

**Frequency cap.** Games can be short. Five full-screen ads in twenty minutes is punishing and hurts retention. Recommended: skip the first game of a session, then at most one interstitial per ~3 minutes. Track the timestamp in `AdsProvider`.

### 4.5 Remove Ads hook — build it now, not later

`settings.tsx` literally promises *"Theme, sound effects, and premium options will live here."*

Put an `adsEnabled` boolean in `AdsProvider`, persisted via the same pattern as `src/utils/prefs.ts` / `src/utils/setupStorage.ts`. Every `AdBanner` and the interstitial check it. A Remove Ads IAP later then becomes a one-line flip instead of a refactor.

---

## 5. Compliance — the part that causes rejections

### 5.1 Consent ordering (get this exact)

```
1. iOS ATT prompt        (expo-tracking-transparency)
2. UMP consent form      (bundled with the ads SDK)
3. Initialise ads SDK
4. Request first ad
```

- **The UMP form must run before the first ad request** for GDPR / UK GDPR.
- **Requesting IDFA without showing the ATT prompt is an automatic App Store rejection.**

### 5.2 `app-ads.txt`

Host at the root of the developer website listed on both stores (GitHub Pages is acceptable). Without it, fill rate and rates suffer from spoofing protections.

### 5.3 Family-friendly WITHOUT Kids Category — the consistency trap

| Where | Setting |
|---|---|
| AdMob | Max ad content rating → **G** (or PG) |
| **Play Console** | Target audience → **13+**. Ticking any under-13 bracket activates Google's **Families Policy**, which severely restricts permitted ad SDKs and targeting. |
| App Store | Answer the age questionnaire honestly (~12+). **Do not opt into the Kids Category.** |
| Code | Leave `tagForChildDirectedTreatment` **off** — which is exactly why the Play setting must be 13+ to stay consistent. |

### 5.4 Privacy declarations

Required, and mismatches are a leading rejection cause:

- **Privacy policy** at a public URL. Must disclose: Google AdMob serves ads; device identifiers (IDFA / Android Advertising ID), IP and ad-interaction data are collected by Google; link to Google's policy; how EU/UK users withdraw consent; a contact email. **The app itself collects nothing** — all state is local `AsyncStorage` — say so, it's a selling point.
- **Apple App Privacy labels** — declare `Identifiers → Device ID` used for **Third-Party Advertising**.
- **iOS Privacy Manifest** (`PrivacyInfo.xcprivacy`) — Expo generates one for its modules and the ads SDK ships its own. **Verify both land in the final build** rather than assuming.
- **Google Play Data Safety form** — separate from Apple's, must be consistent with the privacy policy.

No user accounts exist, so Apple's account-deletion requirement does not apply. Keep it that way for v1.0.

---

## 6. Bugs found during research (context, not ads)

### 6.1 🔴 Android launch shows the Expo logo — confirmed by hash

`assets/images/splash-icon.png` on main hashes to `5ee5db91d59518c45ebcc99a2f5afc57`, which is **byte-identical to the Expo starter template's default splash art**. It's referenced by the `expo-splash-screen` plugin at `imageWidth: 76`.

The background is already `#f7ef4c` — the same yellow the `IntroSequence` opens on — so removing the `image` key entirely yields a clean yellow launch screen that hands off seamlessly into the EnJoy Games intro. That is the owner's stated preference. Alternatively, replace the art with brand material from `assets/intro/`.

Note the file is also only **228×213**, far too small to render crisply at 3x regardless.

### 6.2 🔴 Missing font glyphs — systemic, verified by parsing `cmap` tables

Several UI symbols do not exist in the bundled fonts and render as tofu/blank wherever a custom `fontFamily` is applied:

| Glyph | Codepoint | Quicksand_700Bold | BalooChettan2 (700/500) | Used for |
|---|---|---|---|---|
| `↩` | U+21A9 | ❌ | ❌ | Take-back button + its subtitle in the "This Turn's Words" modal |
| `☸` | U+2638 | ❌ | ❌ | **Chakra branding throughout** |
| `✓` | U+2713 | ❌ | ❌ | "Correct ✓" |
| `↺` | U+21BA | ❌ | ❌ | Just Cards reshuffle |
| `←` `→` | U+2190/2192 | ❌ | ✅ | Back / next buttons |
| `×` `•` `—` `’` | — | ✅ | ✅ | Safe to use |

**Confirmed instance:** in `src/app/game.tsx`, `modalStyles.subtitle` (`fontFamily: 'Quicksand_700Bold'`) renders *"Tap ↩ to take back a mis-tapped Correct"* — the `↩` is tofu. The button itself (`correctionStyles.removeBtnText`) sets no `fontFamily`, so Android's Noto fallback may rescue it; behaviour differs between iOS and Android and between OS versions. That inconsistency is why only some symbols look broken.

**Recommended fix:** replace these with small inline SVGs (`react-native-svg` is already a dependency). For `☸` specifically, **use the existing `src/components/card/Chakra.tsx` SVG component** — it's already in the codebase, already on-brand, and strictly better than a text glyph.

Anywhere `←` or `→` appears under `Quicksand_700Bold`, it is currently broken; under Baloo Chettan 2 it is fine.

### 6.3 🟠 `settings.tsx` is a placeholder — rejection risk

Still renders "Settings coming soon" on main. Apple **Guideline 4.2 (Minimum Functionality)** flags placeholder screens. Either fill it (sound toggle, Remove Ads / restore purchases, privacy policy link, reset setup, version number) or remove the Settings entry from the home menu before submitting. Since the privacy policy link has to live somewhere, filling it is the better path.

### 6.4 🔴 Card content volume — the biggest product risk

`src/data/cards.json` holds **20 cards × 6 categories = 120 words**. Four players exhaust that in one evening, after which the deck-cycling logic (which is correct) simply starts repeating. Recommend **150+ cards** before launch.

> 💡 `cards.json` is bundled JavaScript, so **EAS Update can push new cards to installed apps without a store review.** Configure `expo-updates` before launch and card content becomes a continuous, review-free release channel.

---

## 7. Repository state note

There is a stale branch, **`claude/complete-program-testing-gr4g5k`** (tip `7f5d4a2`), containing a 283-test suite and a `ROADMAP.md`. It was written against commit `a5e650c` and is **superseded** — `main` has since gained Board Mode, a rewritten `gameReducer` (+379 lines, new actions including `UNDO_CORRECT`), and its own Jest suite. Those old tests will not pass against current main. Treat that branch as reference material only unless the owner says otherwise. `ROADMAP.md` on it still has useful launch content, but its Phase 1 is partly complete on main already (bundle IDs, `eas.json`, icon).

---

## 8. Open questions for the owner

1. **Interstitial timing** — on results *mount* (literal "end of each game") or on results *exit* via Play Again / Home (recommended)?
2. **Banner on `setup.tsx`?** — acceptable but not obviously worth it.
3. **Home screen banner** — worth the layout rework, or leave Home ad-free?
4. **AdMob account** — created yet? App IDs and ad unit IDs are needed before anything can be wired beyond test IDs.
5. **Privacy policy hosting** — which domain? Needed for both the policy and `app-ads.txt`.

---

## 9. Suggested implementation order

1. Create the AdMob account and both apps; note the app IDs. *(Blocks everything past step 4.)*
2. Install the two packages, add both config-plugin blocks to `app.json`.
3. Build an EAS development build; confirm the app still runs on a real device.
4. Scaffold `src/ads/` with **test** ad units, no-op fallback, and the mock added to `jest.setup.js`. Confirm the existing test suite still passes.
5. `AdsProvider` into `_layout.tsx` (inside `GameProvider`), with the ATT → UMP → init sequence.
6. Banners on How to Play, Settings, Completed Words, Results.
7. Interstitial: preload on game start, show on results exit, with the frequency cap.
8. Swap in real ad unit IDs; verify on device with a real (non-clicked) ad.
9. Privacy policy live, `app-ads.txt` live, both stores' privacy forms completed.

# Indi-Q — Launch Roadmap

**From:** working codebase, 283 passing tests, zero store presence
**To:** live on the App Store and Google Play, with ads

**Decisions locked in:** Individual Apple account · iOS + Android together · ads in v1.0 · family-friendly, *not* Kids Category

---

## The one thing that decides your timeline

> **Google Play's closed-testing rule is your critical path — start it first, not last.**

Personal (individual) Google Play developer accounts must run a **closed test with a minimum number of real testers, opted in continuously for 14 days**, before you can even apply for production access. The threshold has been revised more than once (it started at 20 testers, was later reduced to 12) — **check the live number in Play Console before you recruit**, and recruit 3–4 spare testers because anyone who un-installs breaks your streak.

Everything else in this roadmap can run in parallel with those 14 days. Nothing can shorten them. So the ordering that actually matters is:

1. Pay both fees, fix the build blockers, get *any* installable Android build out to 12+ testers.
2. Let the 14-day clock run while you do content, ads, store assets and iOS.
3. Submit both stores at the end of the window.

Realistic end-to-end: **5–8 weeks**, and the long pole is card content, not code.

---

## Phase 0 — Accounts, identifiers, and one permanent decision

### 0.1 Pick your bundle identifier — this is forever

Once an app ships under a bundle ID you can never change it. Same string on both platforms keeps your life simple:

```
com.adarshanil.indiq
```

Reverse-DNS, lowercase, no hyphens or underscores. Decide this before anything else, because it goes into `app.json`, both store listings, AdMob, and your signing certificates.

### 0.2 Accounts to create

| Account | Cost | Notes |
|---|---|---|
| Apple Developer Program | £99 / year | Individual — approval is usually same-day to 48h. **Your legal name becomes the public "seller" on every listing.** No D-U-N-S needed (that's the company-account trap you've avoided). |
| Google Play Console | $25 one-time | Identity verification can take a few days. Create this **immediately** — the 14-day test clock can't start until it exists. |
| Google AdMob | Free | Needs bank details + tax info before it will pay out. Set up early; payment verification is slow. |
| Domain or GitHub Pages | £0–12 / yr | You need a public URL for the privacy policy **and** `app-ads.txt`. GitHub Pages is free and completely acceptable. |

### 0.3 Name availability

Check "Indi-Q" is free on both stores before committing to it in artwork. App Store names are 30 characters and reserved on a first-come basis; Play is more forgiving about duplicates but you still want to be findable. Consider whether you're searchable — "Indi-Q" alone is a weak search term. Something like `Indi-Q — Malayalam Party Game` as the store name (with "Indi-Q" as the on-device name) buys you real keyword coverage.

---

## Phase 1 — Build blockers

**None of these are optional. The project cannot produce a store build until all are fixed.**

### 1.1 Missing bundle identifiers — hard blocker

`app.json` has no `ios.bundleIdentifier` and no `android.package`. EAS Build will refuse to start.

```jsonc
"ios": {
  "bundleIdentifier": "com.adarshanil.indiq",
  "buildNumber": "1",
  "supportsTablet": false        // set true only if you'll design + screenshot for iPad
},
"android": {
  "package": "com.adarshanil.indiq",
  "versionCode": 1
}
```

### 1.2 Your app icon is still the Expo default — hard blocker

`assets/expo.icon/icon.json` is the stock Expo symbol on the Expo-blue gradient, and `assets/icon.png` / `assets/images/icon.png` are byte-identical template leftovers from the initial commit. Apple rejects Expo/React template icons outright.

You need:

- **iOS:** 1024×1024 PNG, **no alpha channel, no transparency, no pre-rounded corners** (Apple applies the mask). Either replace the `.icon` bundle contents or switch `ios.icon` to a plain PNG path.
- **Android adaptive:** foreground (512×512, with the safe zone respected — the outer ~18% gets cropped on some launchers), background, and monochrome layers. You already have files at these paths; confirm they're *yours* and not template art.
- **Play Store listing icon:** 512×512, 32-bit PNG with alpha.

You already have strong brand assets in `assets/intro/` (`iq-logo.png`, `iq-mandala.png`) — the icon should be derived from those, not designed fresh.

### 1.3 No `eas.json` — hard blocker

Create it with three profiles:

```jsonc
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": { "production": {} }
}
```

The `development` profile is what replaces Expo Go once ads land (ads are native code — see Phase 3).

### 1.4 Splash screen

`assets/images/splash-icon.png` is **228×213** — far too small; it'll look soft on a 3x display. Background is `#f7ef4c`, which matches the EnJoy yellow your intro opens on, so the handoff concept is right. Re-export the splash artwork at 1024px+ on the long edge.

### 1.5 Template junk to delete

These are all unused Expo starter leftovers inflating your binary:

```
assets/images/react-logo.png, react-logo@2x.png, react-logo@3x.png
assets/images/expo-badge.png, expo-badge-white.png, expo-logo.png
assets/images/tabIcons/          (whole directory)
assets/images/tutorial-web.png
assets/images/logo-glow.png
assets/icon.png                  (duplicate of assets/images/icon.png)
```

### 1.6 Dependency audit

Twelve packages have **zero direct references** in `src/`:

`@expo/ui` · `expo-glass-effect` · `expo-symbols` · `expo-device` · `expo-web-browser` · `expo-linking` · `expo-constants` · `expo-image` · `react-native-gesture-handler` · `react-native-reanimated` · `react-native-worklets` · `expo-system-ui`

⚠️ **Do not blind-delete these.** `expo-router` pulls in `gesture-handler`, `reanimated`, `worklets`, `screens`, `safe-area-context`, `constants` and `linking` transitively — removing them breaks navigation even though nothing imports them by name. The genuinely safe removals are the leaf UI packages: `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-device`, `expo-web-browser`, `expo-image`.

Remove them one at a time, running `npm test` and a real device build between each. Binary size matters for install conversion, but a broken build matters more.

---

## Phase 2 — Product gaps

These won't stop a build. They *will* stop you getting good reviews — or get you rejected.

### 2.1 🔴 Board Mode is exposed but not implemented — fix or hide

This is the most serious functional issue in the codebase.

`setup.tsx` shows a **Board Mode** toggle that a user can switch on. But trace what happens when they do:

- `game.tsx` renders the `CategoryBar` only when `!config.boardMode` — so in board mode **there is no way to pick a category**.
- Nothing else ever dispatches `SELECT_CATEGORY` in board mode, so `selectedCategory` stays `null` for the whole turn.
- `handleReveal` skips its guard in board mode, so the card reveals with **all six words visible and none dimmed**.
- The locked-category banner is gated on `selectedCategory &&` — so it never appears.
- Worst: `MARK_CORRECT` only logs to `completedWords` and `cardUsage` **inside `if (turn.selectedCategory)`**. In board mode, scores increment but **no word is ever recorded** — the Completed Words screen stays permanently empty.

The type definitions call this "Section 8, not built yet", which is honest — but the toggle is live in the UI. **For v1.0, remove the Board Mode switch from `setup.tsx`** (keep all the reducer plumbing, it's already tested and correct). Ship it in v1.1 when the board actually exists.

### 2.2 🔴 20 cards is your biggest product risk

20 cards × 6 categories = **120 words total**. A party game with four players burns through that in a single evening, and your deck-cycling logic — correct as it is — will start re-serving the same words.

This is the single thing most likely to produce two-star reviews, and it's content work, not engineering. **Target 150+ cards before launch** (900 words). Your `cards.json` schema and the passing integrity tests in `src/data/__tests__/cards.test.ts` mean you can add cards confidently — the test suite validates uniqueness, all six categories, non-empty Malayalam, and valid chakra categories on every single card automatically.

> 💡 **Card content can ship over-the-air.** `cards.json` is bundled JavaScript, so EAS Update can push new cards to installed apps **without a store review**. Launch with a solid deck, then expand continuously. This is a genuine strategic advantage — build the OTA pipeline in Phase 6.

### 2.3 🟠 The Settings screen is a literal placeholder

`settings.tsx` renders "Settings coming soon". Apple's **Guideline 4.2 (Minimum Functionality)** and reviewers' general dislike of placeholder UI make this a live rejection risk.

Either fill it (sound toggle, Remove Ads restore-purchases, reset saved setup, privacy policy link, version number) or **remove the Settings button from the home menu for v1.0**. The privacy policy link has to live somewhere anyway — Settings is the natural home, which argues for filling it.

### 2.4 🟡 Quality gaps worth closing

- **No sound.** A party game with a visible countdown really wants a tick in the final 10s and a buzzer at zero. `expo-audio`. Your `CountdownTimer` already computes `isWarning` (≤10s) and `isCritical` (≤5s) — the hooks are sitting there.
- **No haptics.** `expo-haptics` on Correct / Void / timer-expiry is a few lines and disproportionately improves feel.
- **Accessibility.** No `accessibilityLabel`s anywhere. Rarely a rejection cause, but VoiceOver users currently get nothing useful from the card.
- **Malayalam word coverage.** Verify every card's `wordsMl` renders correctly on a real device — Baloo Chettan 2 glyph coverage for conjuncts is worth eyeballing on hardware, not just simulator.

### 2.5 Content rights — low risk, worth knowing

Your cards use real names (Mohanlal, Mammootty) and film titles (Drishyam, Premam). Using factual names as guessing prompts is standard practice for the genre — Taboo, Articulate and Heads Up all do it, and neither store will flag it. Just keep **film stills, posters and photographs out of your artwork**. Your card visuals are original vectors, so you're clean.

---

## Phase 3 — Ads (v1.0)

Full technical detail was covered in the previous discussion; this is the shipping checklist.

### 3.1 The workflow cost

AdMob is native code. `expo-ads-admob` has been dead since 2022. Adding ads means **Expo Go stops working** and you move to EAS development builds (`eas build --profile development`). Budget half a day for that transition alone.

```bash
npx expo install react-native-google-mobile-ads expo-tracking-transparency
```

`react-native-google-mobile-ads@16.4.0` ships an Expo config plugin, wraps Google Mobile Ads iOS 13.5 / Android 25.4, and bundles the UMP consent SDK. Android `minSdk 23`.

### 3.2 Placement rules — the account-safety ones

- ✅ Banners on **How to Play, Settings, Completed Words, Results**.
- ❌ **Never on `game.tsx`.** The bottom of that screen is Correct ✓ / Void / Skip / End Turn, tapped fast under a running timer. Accidental clicks generate invalid traffic, and invalid traffic gets AdMob accounts **suspended**. This is the single highest-stakes rule here.
- ⚠️ Home (`index.tsx`) computes its whole layout from screen height with ornaments pinned to `bottom: 0`. A banner overlaps the bottom ornament cluster — it needs the geometry reworked, not a drop-in.
- ⚠️ Just Cards has 72px nav circles at the bottom; a banner crowds them.
- **Interstitial:** preload when the game starts, fire on **Play Again / Home** in `results.tsx` — not over the winner reveal. Cap at one per ~3 minutes and skip the first game of a session.
- Use `ANCHORED_ADAPTIVE_BANNER` and reserve its height so content doesn't jump.

### 3.3 Family-friendly, not Kids Category — the setting that matters

You chose family-friendly *without* Kids Category. To keep that working:

- **AdMob:** set maximum ad content rating to **G** (or PG). This filters what advertisers can serve you.
- **Play Console:** in the Target Audience & Content section, set your target age to **13+**. If you tick any under-13 bracket, Google's **Families Policy** activates and severely restricts which ad SDKs and targeting you're allowed — exactly what you said you didn't want.
- **App Store:** answer the age-rating questionnaire honestly; you'll land around 12+. Do **not** opt into the Kids Category.
- Keep `tagForChildDirectedTreatment` **off** — but be aware that's precisely why the 13+ Play setting has to be consistent with it.

### 3.4 Consent — a top-3 first-submission rejection cause

- **UMP consent form must run before your first ad request** (GDPR/UK GDPR). The package bundles UMP; call `requestConsentInfoUpdate` on launch.
- **iOS ATT prompt** via `expo-tracking-transparency`, with a `userTrackingUsageDescription` string in `app.json`. Requesting IDFA without showing the ATT prompt is an automatic rejection.
- Order matters: ATT prompt → UMP consent → initialise ads → request first ad.

### 3.5 `app-ads.txt`

Host it at the root of the developer-website domain you list on both stores. Without it, your fill rate and rates take a real hit from spoofing protections.

### 3.6 Protecting your 283 tests

Wrap the SDK behind `src/ads/` and add one line so no existing test needs editing:

```jsonc
// package.json → jest
"moduleNameMapper": {
  "^react-native-google-mobile-ads$": "<rootDir>/src/ads/__mocks__/gma.ts"
}
```

Always use Google's published **test ad unit IDs** in development. Clicking your own live ads is the fastest route to a ban.

---

## Phase 4 — Legal & privacy

With ads in v1.0, this phase is mandatory and unusually fiddly. Mismatches between what you declare and what your SDKs actually do are a leading rejection cause.

### 4.1 Privacy policy — required by both stores

Must be a **public, live URL** (GitHub Pages is fine). With AdMob it must disclose, at minimum:

- Google AdMob is used to serve advertising
- Device identifiers (IDFA / Android Advertising ID), IP address, and ad-interaction data are collected by Google
- A link to Google's own privacy policy
- How EU/UK users withdraw consent
- Contact email

You collect nothing yourself — all your game state is local `AsyncStorage` — so say that plainly. It's a genuine selling point.

### 4.2 Apple App Privacy "nutrition labels"

Filled in App Store Connect. With AdMob you must declare **Identifiers → Device ID**, used for **Third-Party Advertising**, and **linked to the user** where applicable. Under-declaring here is a common rejection.

### 4.3 iOS Privacy Manifest (`PrivacyInfo.xcprivacy`)

Required since 2024 for apps and SDKs using "required reason" APIs. Expo generates one for its own modules and `react-native-google-mobile-ads` ships its own — **verify both are present in the final build** rather than assuming.

### 4.4 Google Play Data Safety form

Separate from Apple's, asks similar questions, and must be consistent with your privacy policy and with what AdMob actually collects.

### 4.5 Not applicable — worth confirming

You have **no user accounts**, so Apple's account-deletion requirement doesn't apply. Keep it that way for v1.0; adding accounts adds a whole compliance surface.

---

## Phase 5 — Store listings & assets

### Apple App Store

| Item | Spec |
|---|---|
| App name | 30 chars |
| Subtitle | 30 chars |
| Keywords | 100 chars total, comma-separated, no spaces |
| Promotional text | 170 chars (editable without review — useful) |
| Description | 4,000 chars |
| Screenshots | **6.9" iPhone (1290×2796) is the required baseline** — verify current requirements in App Store Connect, Apple changes these. iPad shots only if `supportsTablet: true`. |
| App preview video | Optional, 15–30s |
| Support URL | **Required** |
| Category | Games → Trivia, secondary Games → Family |

### Google Play

| Item | Spec |
|---|---|
| App name | 30 chars |
| Short description | 80 chars |
| Full description | 4,000 chars |
| **Feature graphic** | **1024×500 — required, and easy to forget** |
| Screenshots | Min 2, up to 8, min 320px on the short edge |
| App icon | 512×512, 32-bit PNG with alpha |
| Content rating | IARC questionnaire |
| Target audience | **Set 13+** (see 3.3) |

### Screenshot strategy

Your strongest visuals are the branded home screen, a revealed card with Malayalam text, the Chakra round, and the results screen. Add short caption overlays — plain unannotated screenshots convert poorly. Take them at the exact required resolution from a real device or simulator; both stores reject mis-sized images.

---

## Phase 6 — Builds & testing

### 6.1 You do not need a Mac

EAS Build compiles iOS in the cloud and EAS Submit uploads for you. App Store Connect is entirely web-based. A Mac is convenient, not required.

### 6.2 Credentials

Let EAS manage signing automatically (`eas credentials`). Manual certificate and provisioning-profile handling is a common source of multi-hour dead ends for first-time shippers, with no upside for a solo developer.

### 6.3 Sequence

1. `eas build --profile development` → install on your own device → verify ads, fonts, intro animation on **real hardware**. The simulator lies about fonts and animation timing.
2. `eas build --profile production --platform android` → upload to Play **Internal testing** (instant, no review).
3. **Start the 14-day closed test immediately** with 12+ real testers. This is your critical path — everything else runs alongside it.
4. `eas build --profile production --platform ios` → TestFlight. **Internal** TestFlight (up to 100 testers) needs no review; external does.
5. Test on the oldest and smallest device you can find. Your home screen does aggressive height-based layout maths — a small screen is exactly where `menuBottom` clamping gets exercised.

### 6.4 Set up EAS Update now

```bash
npx expo install expo-updates
eas update:configure
```

This is what lets you push new cards and copy fixes without a store review later. Configure it before launch, not after.

### 6.5 Crash reporting

Add Sentry or similar before launch. Shipping blind to crashes on hardware you don't own is how one-star reviews arrive unexplained.

---

## Phase 7 — Submission

### Review expectations

- **Apple:** usually 24–48h, occasionally longer for a brand-new account's first submission.
- **Google:** first submission from a new personal account can take several days on top of the 14-day test window.

### Review notes

No login is required to play your app — say so explicitly in the review notes. It removes the single most common back-and-forth. Mention that Chakra Round is reachable from the between-turns screen so the reviewer actually sees your headline feature.

### Rejection causes ranked for *this specific app*

1. **Placeholder Settings screen** (Guideline 4.2) — fix or remove it. See 2.3.
2. **Privacy label mismatch** — declaring less than AdMob actually collects.
3. **Missing/late ATT prompt** while using IDFA.
4. **No UMP consent flow** for EU users.
5. **Default template icon** — already caught, see 1.2.
6. Broken Board Mode if you leave the toggle in — a reviewer *will* flip every switch. See 2.1.

---

## Phase 8 — Post-launch

- Watch AdMob invalid-traffic warnings closely in week one — placement mistakes surface fast.
- **Remove Ads IAP.** Your Settings screen already promises "premium options"; build `adsEnabled` as a persisted flag from day one (same pattern as `setupStorage.ts`) so this is a one-line flip, not a refactor.
- Ship card packs over the air via EAS Update.
- Then, in rough priority order: sound, Board Mode (Section 8), more categories, online/remote play.

---

## Costs

| Item | Cost |
|---|---|
| Apple Developer Program | £99 / year |
| Google Play Console | $25 one-time (~£20) |
| Domain (optional — GitHub Pages is free) | £0–12 / year |
| EAS Build | Free tier is workable solo (queued, limited concurrency); paid tiers from $99/mo if you outgrow it |
| AdMob | Free — it pays *you* |
| **Year-one total** | **≈ £120** |

---

## Suggested ordering

| Week | Focus |
|---|---|
| 1 | Pay both fees. Fix Phase 1 blockers (bundle IDs, icon, `eas.json`, splash). Get an Android build to 12+ testers — **start the 14-day clock.** |
| 2–3 | Card content to 150+. Remove Board Mode toggle. Fill or remove Settings. Ads integration + consent flows. |
| 4 | Privacy policy live. `app-ads.txt`. Both privacy forms. Store listings, screenshots, feature graphic. |
| 5 | TestFlight + closed test feedback. Sound and haptics if time allows. Real-device testing across screen sizes. |
| 6 | Submit both stores. |

**Biggest risks, honestly ranked:** (1) card content volume, (2) the ads-in-v1.0 compliance surface, (3) Google's 14-day window if you start it late.

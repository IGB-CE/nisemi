# AdMob Integration Plan

Branch: `feat/admob`

## Ad Strategy (minimal, user-friendly)

Two ad placements only, both chosen to avoid disrupting core flows:

1. **Rewarded ad → driver boost**
   Drivers can promote their ride to the top of search results for 12 hours by watching a rewarded video ad. User-initiated, highest CPM, doubles as a product feature.

2. **Interstitial → after passenger booking confirmation**
   Shown only after a successful reservation, never during the booking flow. Capped at once per session and skipped for first-time bookers.

Banners deferred. Native ads deferred. Rewarded ads beyond the boost flow deferred.

---

## Phase A — Privacy & Policies

### A1. Draft privacy policy + terms text (Albanian + English)
- Source files: `apps/policies/privacy.md` and `apps/policies/terms.md`
- Cover: data collected (email, phone, name, avatar, trip data, IP/device for AdMob), purpose, retention, AdMob disclosure, user rights, contact email
- **Inputs needed from product owner:** contact email, legal entity name behind the app

### A2. Host the public URL
- Option A *(recommended)*: serve `GET /privacy` and `GET /terms` on the API server, rendering the markdown to HTML. Zero extra hosting.
- Option B: GitHub Pages on the repo (`igb-ce.github.io/albania-rides/privacy`).

### A3. In-app screens
- Add "Politika e Privatësisë" and "Kushtet e Përdorimit" links in `apps/mobile/app/(tabs)/profili.tsx`
- Each link opens a screen that renders the same markdown content as the public URL

---

## Phase B — AdMob Foundation

### B1. Install + configure the SDK
- `npx expo install react-native-google-mobile-ads`
- `app.config.js` plugin config uses **test app IDs by default** (Google's official):
  - Android: `ca-app-pub-3940256099942544~3347511713`
  - iOS: `ca-app-pub-3940256099942544~1458002511`
- Add placeholder env vars (`ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`) so production builds substitute real IDs
- Create `apps/mobile/lib/ads.ts` as the single source of truth for which ad unit IDs to use (test in `__DEV__`, real in prod)

### B2. iOS App Tracking Transparency (ATT)
- `npx expo install expo-tracking-transparency`
- After login, on first-ever launch, show the system tracking permission dialog with Albanian copy
- Initialize AdMob **only after** the user has responded — denial is fine, prompt just has to happen

### B3. EU consent via Google UMP
- Wire up the UMP form bundled in `react-native-google-mobile-ads`
- Show on first launch, after ATT on iOS
- Most Albanian users won't see it; EU travelers using the app will

---

## Phase C — Driver Boost Feature

### C1. Backend: `Trip.boostedUntil`
- Prisma migration: add `boostedUntil DateTime?` to `Trip`
- New endpoint: `POST /api/v1/trips/:id/boost` (authenticated as the trip's driver; sets `boostedUntil = now() + 12h`)
- Trip search ordering changes to put currently-boosted trips first:
  ```sql
  ORDER BY (boostedUntil > NOW()) DESC, departureAt ASC
  ```

### C2. Mobile: rewarded ad on driver trip card
- Button "Promovo udhëtimin 12h ⚡" on a driver's own trip card, visible only when `boostedUntil` is past or null
- Tap → confirmation dialog → load + show rewarded ad
- On reward callback → call `/trips/:id/boost` → refresh list
- Display a "Promovuar deri HH:MM" pill on currently-boosted trips so the driver sees the boost is active

---

## Phase D — Passenger Interstitial

### D1. Mobile: interstitial after successful booking
- Triggered only after the booking confirmation dialog has been dismissed
- Cap: once per session, regardless of how many bookings
- Skip entirely on the user's first booking (don't burn the first impression)
- Skip entirely if user denied ATT on iOS

---

## Phase E — Production Prep

### E1. Real AdMob account
*Performed by the product owner, not the codebase:*
- Create AdMob account at admob.google.com
- Register Android app + iOS app
- Create one rewarded ad unit and one interstitial ad unit per platform (4 ad units total)
- Drop real IDs into prod env vars

### E2. Store privacy declarations
*Performed at submission time:*
- Google Play Console → Data Safety form: declare AdMob collects advertising ID, app activity, device info; shared with Google
- Apple App Store Connect → Privacy Nutrition Labels: same disclosure in Apple's format
- Both link to the privacy policy URL from A2

---

## Safety Rules

Baked into the implementation, not optional:

- **Test ad IDs in development always.** Switch is automatic via `__DEV__` in `apps/mobile/lib/ads.ts`. Real IDs only in production builds.
- **Never click your own real ads during testing.** AdMob bans accounts for self-clicking.
- **Init AdMob only after ATT + UMP consent flow completes.** Never before.
- **No ads during driving/navigation, booking submission, reservation acceptance, or any safety-critical flow.**

---

## Time Estimate

| Phase | Effort |
|-------|--------|
| A — Privacy & policies | Half day |
| B — AdMob foundation (SDK + ATT + UMP) | Half day |
| C — Driver boost feature | Half day |
| D — Passenger interstitial | 1–2 hours |
| E — Production prep | Depends on AdMob account setup |

Total active engineering time: **~1.5–2 days**.

---

## Decisions Locked In

- **Contact email:** `support@ikim.al` (mailbox must be created/forwarded before app submission)
- **Legal entity name:** Ikim (the app brand)
- **Privacy policy hosting:** API server — `GET /privacy` and `GET /terms` routes that render markdown to HTML

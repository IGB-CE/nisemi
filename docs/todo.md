# Nisemi — Things Left To Do

Snapshot of remaining work as of 2026-05-25. Loosely ordered by priority for launch.

---

## Quick wins (small, can be done anytime)

- [ ] **Tighten `JWT_SECRET` on Render** — currently uses the dev value (`albania-rides-jwt-secret-change-in-production`). Generate a strong random string and set it as a Render env var. All existing JWTs will be invalidated, so users will be logged out once.
- [ ] **Update `AGENTS.md`** title and references from "Albania Rides" → "Nisemi" (cosmetic).

---

## Pre-launch must-haves

### Apple Sign In (required for App Store submission)

Apple's App Store rule: any iOS app that offers third-party social sign-in (Google, Facebook, etc.) **must** also offer Sign In with Apple. Until this is done, App Store submission will be rejected.

- [ ] Enroll in Apple Developer Program — $99/yr at <https://developer.apple.com/programs/>. Approval takes 1–2 days.
- [ ] Once enrolled: enable **Sign In with Apple** capability on the App ID `al.nisemi.app`
- [ ] Generate a Services ID + private key in Apple Developer for backend token verification
- [ ] Schema: add `appleId String? @unique` to `User` model
- [ ] Install `expo-apple-authentication` in mobile + Apple JWKS validation lib in API
- [ ] `POST /api/v1/auth/apple` endpoint that mirrors the Google flow (auto-link by email)
- [ ] `<AppleSignInButton>` next to `<GoogleSignInButton>` in login + register, iOS only

### Real AdMob account

Currently using Google's official test ad IDs in dev — automatic switch via `__DEV__` in `apps/mobile/lib/ads.ts`. Need real IDs for prod.

- [ ] Create AdMob account at <https://admob.google.com>
- [ ] Register Android app + iOS app
- [ ] Create one rewarded ad unit and one interstitial ad unit per platform (4 total)
- [ ] Drop real IDs into EAS production env vars: `EXPO_PUBLIC_ADMOB_*` (see `apps/mobile/lib/ads.ts` for exact names)

### Store submissions

- [ ] **Google Play Console** — Data Safety form: declare AdMob collects advertising ID, app activity, device info; shared with Google. Link to privacy URL `https://api.nisemi.al/privacy`.
- [ ] **Apple App Store Connect** — Privacy Nutrition Labels: same disclosure in Apple's format
- [ ] Both stores: app screenshots, marketing copy, app icon at required sizes
- [ ] iOS: TestFlight build for internal review before App Store submission

### QA pass

- [ ] Run through `docs/qa-checklist.md` on a real Android device + iOS device
- [ ] Test the full flow against the prod API (api.nisemi.al), not just localhost
- [ ] Confirm Google sign-in works end-to-end on both production binaries

---

## Admin app deployment

Admin runs locally only right now. Deploy options:

- [ ] Pick a host (Render static site, Vercel, Netlify — all free for static Vite output)
- [ ] Add the admin's production URL to `CORS_ORIGIN` env var on Render API
- [ ] If using a custom domain (e.g. `admin.nisemi.al`), set up Cloudflare DNS the same way we did for `api.nisemi.al`

---

## Deferred / post-launch

- [ ] Banner ads in search results / trip listings (deferred from MVP)
- [ ] Native ads (more complex; revisit after product-market fit)
- [ ] Phone OTP verification (currently format-validated only)
- [ ] Online payments
- [ ] Advanced analytics
- [ ] Multi-country support
- [ ] Subscription / booking commission models
- [ ] Featured drivers / promoted trips

---

## Reference

- Render dashboard: <https://dashboard.render.com>
- Supabase project: <https://supabase.com/dashboard/project/fdnrjzxxvvkuvjesaesx>
- EAS project: <https://expo.dev/accounts/bledi-nisemi/projects/nisemi>
- Google Cloud (OAuth, Maps): <https://console.cloud.google.com> → project `ikim`
- GitHub repo: <https://github.com/nisemialb-creator/nisemi>

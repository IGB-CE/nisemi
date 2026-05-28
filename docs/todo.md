# Nisemi — Things Left To Do

Snapshot of remaining work as of 2026-05-28. Loosely ordered by priority for launch.

---

## Quick wins (small, can be done anytime)

- [ ] **Tighten `JWT_SECRET` on Render** — currently uses the dev value (`albania-rides-jwt-secret-change-in-production`). Generate a strong random string and set it as a Render env var. All existing JWTs will be invalidated, so users will be logged out once.
- [ ] **Update `AGENTS.md`** title and references from "Albania Rides" → "Nisemi" (cosmetic).
- [ ] **Change admin password** for `admin@nisemi.al` (currently `admin123`) using the new in-app "Fjalëkalimi" button.

---

## Pre-launch must-haves

### Google Play Console (blocked by D-U-N-S)

Required for organization-account verification.

- [ ] **Send D-U-N-S request email to D&B Albania** (template + all business details ready — see session notes).
- [ ] Wait ~2–4 weeks for D-U-N-S Number to be issued.
- [ ] Register Google Play Console Organization account at <https://play.google.com/console/signup> ($25 one-time, Bledi's account).
- [ ] Complete identity verification (ID upload), enter D-U-N-S, verify domain `nisemi.al` via Search Console.
- [ ] Add Igli as developer/admin once approved.

### Apple Sign In (required for App Store submission)

Apple's App Store rule: any iOS app that offers third-party social sign-in (Google, Facebook, etc.) **must** also offer Sign In with Apple. Until this is done, App Store submission will be rejected.

- [ ] Enroll in Apple Developer Program — $99/yr at <https://developer.apple.com/programs/>. Approval takes 1–2 days. **Only when iOS launch is close** — the $99 clock starts on payment.
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

- [ ] **Google Play Console** — Data Safety form: declare AdMob collects advertising ID, app activity, device info; shared with Google. Link to privacy URL `https://nisemi.al/privacy`.
- [ ] **Apple App Store Connect** — Privacy Nutrition Labels: same disclosure in Apple's format.
- [ ] Both stores: app screenshots, marketing copy, app icon at required sizes.
- [ ] iOS: TestFlight build for internal review before App Store submission.

### QA pass

- [ ] Run through `docs/qa-checklist.md` on a real Android device + iOS device.
- [ ] Test the full flow against the prod API (api.nisemi.al), not just localhost.
- [ ] Confirm Google sign-in works end-to-end on both production binaries.
- [ ] Verify mobile app's Privacy/Terms screens still load after API → nisemi.al redirect.

---

## Done ✅

### Admin app deployment

Deployed on Vercel Hobby at <https://admin.nisemi.al> (CNAME via Cloudflare, gray cloud). `CORS_ORIGIN` on Render API includes `https://admin.nisemi.al`. Admin user seeded: `admin@nisemi.al` / `admin123` (still needs to be changed). Mobile responsive. Password change in topbar.

### Landing site

Deployed on Vercel Hobby at <https://nisemi.al> (CNAME via Cloudflare, gray cloud). 5 pages — Kreu, Rreth nesh, Si funksionon, Pyetje, Kontakt. Albanian, mobile responsive, real Nisemi logo. Business info in `apps/landing/src/config.ts`: address, phone, NIPT (`M31917023G`), legal name (Bledi Demirlika P.F.). `www.nisemi.al` → 308 redirect to apex.

### Privacy / Terms

Source-of-truth in `apps/landing/public/{privacy,terms}.md`. Served at:
- `https://nisemi.al/privacy` and `/terms` (rendered HTML)
- `https://nisemi.al/privacy.md` and `/terms.md` (raw markdown for mobile)
- `https://api.nisemi.al/{privacy,terms,privacy.md,terms.md}` → 301 redirects to nisemi.al (backwards-compat for mobile)

### Email

Cloudflare Email Routing on `nisemi.al`:
- `info@nisemi.al` → forwards to `nisemi.alb@gmail.com` (legal / business)
- `support@nisemi.al` → forwards to `nisemi.alb@gmail.com` (user-facing)

### Google sign-in

End-to-end: schema (`googleId`, nullable `passwordHash`), backend `/api/v1/auth/google` with audience-array verification, mobile `<GoogleSignInButton>` on login/register, complete-profile gate for phone collection. 3 OAuth client IDs (Web/iOS/Android) configured in Google Cloud project `ikim`.

### Vercel Hobby quirk

Vercel Hobby plan blocks deploys when the commit author email doesn't match the Vercel account email (`nisemi.alb@gmail.com`). The repo's local git is configured to use that email so commits don't get blocked. If you ever clone fresh, run:
```
git config user.email "nisemi.alb@gmail.com"
```

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
- [ ] "Send mail as info@/support@" SMTP setup in Gmail (for outgoing mail from `@nisemi.al` addresses — Cloudflare Email Routing is receive-only)

---

## Reference

- Render dashboard: <https://dashboard.render.com>
- Vercel dashboard: <https://vercel.com/dashboard> (account: `nisemi.alb@gmail.com`)
- Supabase project: <https://supabase.com/dashboard/project/fdnrjzxxvvkuvjesaesx>
- EAS project: <https://expo.dev/accounts/bledi-nisemi/projects/nisemi>
- Google Cloud (OAuth, Maps): <https://console.cloud.google.com> → project `ikim`
- Cloudflare (DNS, Email Routing): <https://dash.cloudflare.com> → zone `nisemi.al`
- GitHub repo: <https://github.com/nisemialb-creator/nisemi>
- QKB (business registry): <https://qkb.gov.al> → search NIPT `M31917023G`

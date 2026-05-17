# QA Checklist — Nisemi MVP

Manual end-to-end test plan before shipping. Fill in the status column:
`✅ pass`, `❌ fail`, `⚠️ partial`, `-` skipped/N-A. Note bug references for failures.

**Environment**
- App version: `1.0.0`
- Build type: `_____` (dev / preview / production)
- API URL: `_____`
- Device: `_____` (model + OS version)
- Tester: `_____`
- Date: `_____`

You will need **two accounts** (one driver, one passenger) to exercise interactive flows.
Easiest setup: one phone + one PC running the dev client, or two phones.

---

## 1. Auth & onboarding

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Register with valid data | Account created, lands on tabs | | |
| 1.2 | Register with invalid Albanian phone (e.g. `123`) | Error: number not valid | | |
| 1.3 | Register with valid phone formats: `069 123 4567`, `+355691234567`, `0691234567` | All accepted | | |
| 1.4 | Register with empty required fields | Error: required fields | | |
| 1.5 | Register with already-used email | Error: email taken | | |
| 1.6 | Register with already-used phone | Error: phone taken | | |
| 1.7 | Login with valid credentials | Lands on tabs | | |
| 1.8 | Login with wrong password | Error shown | | |
| 1.9 | Login with non-existent email | Error shown | | |
| 1.10 | Logout | Returns to login screen | | |
| 1.11 | Re-login after logout | Works | | |
| 1.12 | Force-kill app, reopen | Session persists (no re-login) | | |

---

## 2. Profile

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | View profile | Shows current name, email, phone | | |
| 2.2 | Edit first/last name | Saves and reflects on next view | | |
| 2.3 | Upload avatar from gallery | Image appears in profile and on other screens (chat, driver view) | | |
| 2.4 | Upload very large image (>5MB) | Either compresses or errors gracefully | | |
| 2.5 | Phone number is read-only or properly validated on edit | Behaves correctly | | |

---

## 3. Driver — become driver

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Create driver profile (car make, model, plate, photo) | Saved | | |
| 3.2 | Upload car photo | Appears in trip detail when published | | |
| 3.3 | Edit driver profile | Changes persist | | |

---

## 4. Driver — publish trip

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Open "Publiko" with all fields valid | Trip published, visible in "Shofer" tab | | |
| 4.2 | Map city picker — pick origin & destination | Route line draws between cities | | |
| 4.3 | Pick same city for origin & destination | Validation prevents | | |
| 4.4 | Pick past date/time | Validation prevents | | |
| 4.5 | Pick price 0 | Validation prevents or accepts (per spec) | | |
| 4.6 | Pick 0 seats | Validation prevents | | |
| 4.7 | Publish, then immediately re-check from passenger search | Trip appears in results | | |

---

## 5. Passenger — search

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 5.1 | Search by origin only | Lists matching trips | | |
| 5.2 | Search by origin + destination | Lists trips matching both | | |
| 5.3 | Search by date | Only that day's trips shown | | |
| 5.4 | Search with no results | Empty state shown (not blank screen) | | |
| 5.5 | Open trip detail from result | Shows driver name, photo, rating, car | | |
| 5.6 | View driver profile from trip detail | Opens driver profile screen | | |
| 5.7 | View driver's rating & reviews | Shows correctly | | |
| 5.8 | Boosted trip appears at the top | Boost pill visible | | |

---

## 6. Passenger — reserve

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 6.1 | Reserve 1 seat | Reservation created, pending status | | |
| 6.2 | Reserve more seats than available | Validation prevents | | |
| 6.3 | Try to reserve own published trip | Validation prevents | | |
| 6.4 | Reserve, then cancel before driver acts | Returns to available state | | |
| 6.5 | Driver accepts reservation | Passenger gets push notification | | |
| 6.6 | Driver rejects reservation | Passenger gets push notification | | |
| 6.7 | Reserve after driver accepted other passengers | Seats decrement correctly | | |
| 6.8 | Reserve the last seat | Trip shows as full afterward | | |
| 6.9 | Two passengers race for the last seat | Only one succeeds, other gets error | | |

---

## 7. Driver — manage reservations

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 7.1 | View incoming pending reservations | List shows correct passenger info | | |
| 7.2 | Accept reservation | Status updates, passenger notified | | |
| 7.3 | Reject reservation | Status updates, passenger notified | | |
| 7.4 | View accepted passenger list for a trip | Correct names + seats | | |
| 7.5 | Driver cancels trip with accepted passengers | All accepted passengers notified | | |

---

## 8. Live GPS tracking (in-progress trips)

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 8.1 | Driver: "Fillo udhëtimin" appears within 2h of departure | Button visible | | |
| 8.2 | Start trip — grant foreground + background location | Trip status → IN_PROGRESS | | |
| 8.3 | Start trip — deny background, allow foreground | Fallback dialog shown, still works in foreground | | |
| 8.4 | Start trip — deny all location | Hard error, trip not started | | |
| 8.5 | Passenger (accepted): trip detail shows live map | Driver marker visible, "Përditësuar para Xs" | | |
| 8.6 | Driver moves → passenger sees marker update | Marker animates with ~5s cadence | | |
| 8.7 | Driver backgrounds app | Tracking continues (Android foreground notification visible) | | |
| 8.8 | Lose internet on driver side | "Pa lidhje" shown to passenger after ~15s, reconnects when back | | |
| 8.9 | Passenger NOT accepted opens trip detail | No map / no live data shown | | |
| 8.10 | Driver: "Përfundo udhëtimin" | Status → COMPLETED, map closes for passengers | | |
| 8.11 | Driver cancels mid-trip | Tracking stops, passengers notified | | |
| 8.12 | View past trip's GPS trace (if surfaced anywhere) | Within 90d window, otherwise empty | | |

---

## 9. Chat

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 9.1 | Passenger sends message to driver | Driver sees it on Mesazhet | | |
| 9.2 | Driver replies | Passenger sees it | | |
| 9.3 | Unread badge on Mesazhet tab | Count matches unread messages | | |
| 9.4 | Open conversation | Unread clears | | |
| 9.5 | Very long message (1000+ chars) | Sends, displays without crash | | |
| 9.6 | Send emoji / Albanian special chars (ë, ç) | Renders correctly | | |

---

## 10. Ratings & reviews

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 10.1 | After COMPLETED trip, passenger sees rate prompt | Prompt visible | | |
| 10.2 | Submit 5-star rating + review text | Saves, visible on driver profile | | |
| 10.3 | Try to rate same trip twice | Validation prevents | | |
| 10.4 | Cannot rate trip that wasn't completed | Validation prevents | | |
| 10.5 | Driver's overall rating updates after new review | Average recalculates | | |

---

## 11. Report driver

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 11.1 | Submit report with reason | Saved | | |
| 11.2 | Report appears in admin dashboard | Yes | | |

---

## 12. Boost (rewarded ad)

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 12.1 | Tap "Promovo udhëtimin" on upcoming trip | Confirm dialog | | |
| 12.2 | Watch full test rewarded ad | Trip is boosted for 12h, pill appears | | |
| 12.3 | Skip ad before reward earned | Trip NOT boosted, error shown | | |
| 12.4 | Boosted trip ranks above non-boosted in search | Yes | | |
| 12.5 | Boost expires after 12h | Pill disappears, ranking returns to normal | | |

---

## 13. Push notifications

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 13.1 | Reservation created → driver gets notification | Yes | | |
| 13.2 | Reservation accepted → passenger gets notification | Yes | | |
| 13.3 | Reservation rejected → passenger gets notification | Yes | | |
| 13.4 | Trip started → accepted passengers notified | Yes | | |
| 13.5 | Trip cancelled → accepted passengers notified | Yes | | |
| 13.6 | New chat message → recipient gets notification | Yes | | |
| 13.7 | Tap notification → opens correct screen (deep link) | Yes | | |
| 13.8 | Notifications work with app backgrounded | Yes | | |
| 13.9 | Notifications work with app fully killed | Yes | | |

---

## 14. Admin dashboard (web)

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 14.1 | Admin login | Works | | |
| 14.2 | Non-admin login attempt | Rejected | | |
| 14.3 | Stats dashboard loads with correct counts | Yes | | |
| 14.4 | Users list — search, paginate | Works | | |
| 14.5 | Block user → blocked user can't login | Yes | | |
| 14.6 | Unblock user → can login again | Yes | | |
| 14.7 | Trips list shows all trips with statuses | Yes | | |
| 14.8 | Reservations list | Yes | | |
| 14.9 | Reports list with reason text | Yes | | |
| 14.10 | Approve user button works | Yes | | |

---

## 15. Error handling & resilience

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 15.1 | Disable Wi-Fi mid-flow | Friendly error, not a crash | | |
| 15.2 | Slow 3G connection (use phone's "Network logging" / dev tools) | Loading spinners, no double-submits | | |
| 15.3 | Invalid JWT (expire token manually) | Auto-logout or clear error | | |
| 15.4 | API returns 500 | Friendly error message, retry possible | | |
| 15.5 | Pull-to-refresh on each list screen | Works (or N/A if not implemented) | | |

---

## 16. UI polish

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 16.1 | All text is in Albanian (no English leakage) | Yes | | |
| 16.2 | No "IKIM" brand strings anywhere | Yes (NISEMI only) | | |
| 16.3 | Empty states show on all list screens when empty | Yes | | |
| 16.4 | Loading states (spinners) on all data fetches | Yes | | |
| 16.5 | Error states retry-able | Yes | | |
| 16.6 | Small screen (<5.5") doesn't break layout | Yes | | |
| 16.7 | Large screen / tablet doesn't break layout | Yes | | |
| 16.8 | Date/time picker works on Android & iOS | Yes | | |
| 16.9 | Map renders correctly (not blank) | Yes | | |
| 16.10 | Status bar / safe areas correct in dark mode | Yes | | |

---

## 17. Production build sanity (run on EAS preview/production)

These checks only matter on a release build, not the dev client:

| # | Step | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 17.1 | App installs from EAS preview link | Yes | | |
| 17.2 | App launches without crashing on first open | Yes | | |
| 17.3 | API URL points to production (not localhost / LAN IP) | Yes | | |
| 17.4 | AdMob shows test ads (NOT real ads) in non-prod build | Yes | | |
| 17.5 | AdMob shows real ads in production build only | Yes | | |
| 17.6 | Push notifications work on prod build (production push tokens) | Yes | | |
| 17.7 | App icon shows the Nisemi logo, not old `ikim` | Yes | | |
| 17.8 | Splash screen shows Nisemi | Yes | | |
| 17.9 | Map API key works (no "for development purposes only" overlay) | Yes | | |
| 17.10 | Crash a screen on purpose — does an error reporting service catch it? (Sentry, etc.) | Yes (or N/A if not wired) | | |

---

## Sign-off

- Critical-flow bugs found: `_____`
- Critical-flow bugs fixed: `_____`
- Non-critical bugs deferred to post-launch: `_____`
- Ready to ship: `☐ yes / ☐ no`

Tester signature + date: `_____`

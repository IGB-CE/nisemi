# Real-time GPS Tracking Plan

Branch: `feat/gps-tracking`

## Goal

While a driver is actively running a trip, passengers with an accepted reservation see the driver's live position on a map inside the app. Tracking is **opt-in per-trip** (driver presses "Fillo udhëtimin"), runs in the **foreground and background** on the driver's phone, and stops when the driver presses "Përfundo".

GPS coordinates are persisted server-side with **90-day retention** so disputes, incidents, and admin investigations have an evidence trail.

## Scope

In scope:
- Driver-initiated trip lifecycle: `SCHEDULED → IN_PROGRESS → COMPLETED`
- Foreground + background location streaming on the driver app
- Live driver marker on a Google Map for accepted passengers only
- Socket.io transport through the existing Express API (JWT auth)

Out of scope (deferred):
- Passenger-side ETA / route prediction
- Multi-driver fleet tracking views for admin
- iOS Live Activities or Android persistent notification UI
- Automated cron-based pruning (manual / scripted purge until volume justifies cron)

## Transport

Socket.io on the existing Express HTTP server. One namespace, one room per trip (`trip:<tripId>`).

- Driver socket joins as the **publisher** after `POST /trips/:id/start` succeeds.
- Passengers with `ACCEPTED` reservations join as **subscribers**.
- Server authorizes joins against Prisma (driver owns the trip, or passenger has an accepted reservation on it).
- Driver emits `location` ticks at ~5s intervals (`{ lat, lng, heading, speed, accuracy, ts }`).
- Server broadcasts to the trip room (sender excluded).
- Driver emits `trip:end` (or `POST /trips/:id/end` triggers a server-side broadcast) → server closes the room.

The server batches incoming ticks in memory and flushes to `TripLocation` every ~10s (or on room close), so we don't pay a DB write per 5s tick.

## Trip lifecycle (Phase A)

Prisma migration:

```prisma
enum TripStatus {
  SCHEDULED
  IN_PROGRESS  // NEW
  COMPLETED
  CANCELLED
}

model Trip {
  // ...
  startedAt DateTime?  // NEW
  endedAt   DateTime?  // NEW
}
```

New table for the persisted trace:

```prisma
model TripLocation {
  id         String   @id @default(cuid())
  tripId     String
  trip       Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  lat        Float
  lng        Float
  heading    Float?
  speed      Float?
  accuracy   Float?
  recordedAt DateTime
  createdAt  DateTime @default(now())

  @@index([tripId, recordedAt])
}
```

`recordedAt` is the client-reported timestamp (so replays line up with reality even if writes are batched). `createdAt` is server insertion time.

Endpoints:

- `POST /api/v1/trips/:id/start` — driver only, `SCHEDULED → IN_PROGRESS`, sets `startedAt = now()`.
- `POST /api/v1/trips/:id/end` — driver only, `IN_PROGRESS → COMPLETED`, sets `endedAt = now()`.
- `GET /api/v1/trips/:id/locations` — returns `TripLocation[]` ordered by `recordedAt`. Authorized for the trip's driver, accepted passengers on that trip, and admins.

Both lifecycle endpoints reject the transition if the trip is in any other state. Push notification fires to accepted passengers when a trip starts.

## Socket.io server (Phase B)

- Install `socket.io` in `apps/api`.
- Attach to the Express `http.Server` instance (small refactor of `apps/api/src/server.ts` so we have access to the `Server` not just the Express app).
- Handshake middleware verifies the JWT from `auth.token` query/header, same secret/format as REST.
- On `joinTrip`:
  - Look up trip + caller role.
  - Allow if `trip.driverId === userId` (and trip is `IN_PROGRESS`), or if caller has a reservation on `tripId` with status `ACCEPTED` (and trip is `IN_PROGRESS`).
  - Otherwise reject.
- Relay event names: `location` (driver→server→passengers), `trip:ended` (server→all).
- Persistence: server accumulates ticks per-trip in memory; flushes a batch insert to `TripLocation` every ~10s and on room close.
- Persistence is best-effort — if a write fails, log and drop. The live relay must not stall on DB latency.

## Mobile location plumbing (Phase C)

- `npx expo install expo-location expo-task-manager`
- `app.json` additions:
  - iOS: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: ["location"]`
  - Android: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`
- `apps/mobile/lib/location.ts`:
  - Defines a single TaskManager task `NISEMI_DRIVER_LOCATION_TASK`.
  - Task body sends incoming location batches to whatever socket is currently bound (set at trip-start time, cleared at trip-end).
  - Helpers: `requestDriverLocationPermissions()`, `startDriverTracking(tripId, token)`, `stopDriverTracking()`.

## Driver UI (Phase D)

On `apps/mobile/app/driver/rezervimet/[tripId].tsx` (the driver trip detail screen):

- If `trip.status === 'SCHEDULED'` and `departureAt - now() < 2h`: show **"Fillo udhëtimin"** button (red, primary).
- Button tap flow:
  1. Request foreground + background location permission. Bail on denial with a clear Albanian explainer.
  2. `POST /trips/:id/start`. On 2xx, persist `tripId` in a small AsyncStorage key `nisemi.activeTripId` so the background task survives app restarts.
  3. Open the socket, `joinTrip(tripId)`, start `Location.startLocationUpdatesAsync` with the task name, foreground service config (Albanian notification body: "Po ndjekim udhëtimin tuaj").
- While `IN_PROGRESS`, replace button with **"Përfundo udhëtimin"**.
- Ending: `POST /trips/:id/end`, stop the task, close the socket, clear AsyncStorage.

## Passenger UI (Phase E)

On `apps/mobile/app/udhetime/[id].tsx` for users with `ACCEPTED` reservations:

- When `trip.status === 'IN_PROGRESS'`, render a Google Map view with:
  - Origin and destination city pins (already used elsewhere in the codebase)
  - Live driver marker, updated as ticks arrive
  - "Përditësuar para Xs" caption under the map
- Connection lifecycle: open socket on screen mount, close on unmount or status change.
- If the socket drops or no ticks arrive for >15s, dim the marker and show "Pa lidhje" instead of stale movement.

## Privacy (Phase F)

`apps/api/policies/privacy.md` gains a subsection under §1 about live location:

- Collected only from drivers, only while a trip is `IN_PROGRESS`.
- Shared only with passengers who have an accepted reservation on that trip.
- Stored for **90 days** so disputes and incidents have an evidence trail; then deleted.
- Visible to the trip's driver, accepted passengers, and admins via `GET /trips/:id/locations`.
- Driver can revoke at any time by ending the trip or denying the permission.

`AGENTS.md` updates:
- Move "Real-time GPS tracking" out of "Not Included In MVP".
- Add a new shipped-features bullet under driver/passenger features.

## Safety rules

- Driver location is **never** broadcast outside an `IN_PROGRESS` trip — server-side guard, not just client-side.
- Foreground service notification is visible while the background task runs (Android requirement, also user-friendly).
- Battery-conscious sample rate: 5s minimum interval, ~25m minimum distance filter.
- If the driver ends or cancels the trip, the room is closed server-side before the client confirms — passengers stop receiving updates immediately.
- Passenger join is re-checked on every join, not cached — revoked reservations stop seeing the marker.

## Time estimate

| Phase | Effort |
|-------|--------|
| A — Trip lifecycle backend | Half day |
| B — Socket.io relay | Half day |
| C — Mobile location plumbing | 2–3 hours |
| D — Driver tracking UI | Half day |
| E — Passenger live map | Half day |
| F — Privacy + AGENTS.md | 1 hour |

Total active engineering: **~2–3 days**.

## Decisions locked in

- **Transport:** Socket.io over the existing Express API (not Supabase Realtime, not polling).
- **Background:** Yes — driver's phone keeps streaming with the screen off.
- **Persistence:** Batched inserts to `TripLocation`, 90-day retention.
- **Visibility:** Only accepted passengers on the same trip.
- **Start/end trigger:** Manual driver buttons, no automatic start from `departureAt`.

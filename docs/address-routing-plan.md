# Address-Level Routing Plan

Branch: `feat/address-routing` (proposed)

## Goal

Move from "city → city" trips to **address → address** trips, so drivers can publish:
- **Intercity rides with exact pickup/dropoff** (Tirana, Rruga Myslym Shyri 12 → Durrës, Plazhi i Iliriasë)
- **Intra-city rides** (across one city, like Uber-style short trips)
- **Multi-route trips** where the driver picks one of several possible paths between the two addresses

Passengers can search and reserve by exact address too, and the system shows them only trips whose route actually passes near both their pickup and dropoff.

## Why this is a bigger change than it sounds

The current model is built around discrete city pairs (`originCityId`, `destCityId`), which makes:
- Search a simple `WHERE` clause on city IDs
- Pricing a flat per-seat number that works regardless of pickup distance
- Map rendering a straight line between two city centroids

Address-level routing turns each trip into a **polyline with detour tolerance**, and search into a **geospatial query**: "does this trip's route pass within X meters of the passenger's pickup AND dropoff, in the correct direction along the route?" Several things change at once.

---

## Locked decisions

- **D1 — Cities become optional/derived.** `originCityId` and `destCityId` become nullable on `Trip` and are auto-populated from the Google Places response's `address_components.locality`. Users only ever interact with address search (Google Maps-style); the city field is invisible to them.
- **D2 — Driver picks 1 of up to 3 route alternatives at publish time.** Server stores the chosen encoded polyline.
- **D3 — Separate trip type.** Add `tripType: INTERCITY | INTRACITY` enum on `Trip`. Determined automatically at publish time (`origin city == dest city` ⇒ INTRACITY, else INTERCITY) and surfaced as a filter in passenger search. Leaves room for future per-type rules (different pricing, no boost ads on intra-city, shorter notice window).
- **D4 — Keep per-seat flat pricing.** No per-km calculation yet.
- **D5 — Both driver and passenger control the buffer.** Driver sets a `maxDetourM` per trip ("I'll detour up to X meters for pickup"). Passenger sets a `searchRadiusM` in search ("show me rides within X meters"). **Effective match buffer = `min(driver.maxDetourM, passenger.searchRadiusM)`** — the more restrictive value wins. Sensible defaults: 500m intercity / 200m intra-city on both sides.
- **D6 — Google Places API** with `componentRestrictions: { country: 'al' }`.
- **D7 — Backfill existing trips** with city centroids: `originLat = originCity.lat`, `originLabel = originCity.name`, etc. Old trips display as city-center pins until naturally aged out.
- **D8 — Client-authoritative polyline.** Mobile app calls Google Directions, picks alt, sends polyline to server. Server validates only that polyline endpoints match the submitted lat/lng (within ~50m).
- **D9 — Use `@mapbox/polyline` + `@turf/nearest-point-on-line`** for decoding and point-to-line geometry. Small, well-tested deps.

---

## Scope

### In scope (this plan)
- Add lat/lng/label/polyline fields to `Trip`
- Google Places autocomplete in driver publish + passenger search
- Driver picks 1 of up to 3 route alternatives when publishing
- Passenger search by address with buffer-based matching
- Trip detail map shows the planned polyline (not just two pins)
- Backfill migration for existing city-only trips
- Live GPS tracking polyline (already shipped) stays the same — just now overlays the *planned* route, so passengers can see deviation

### Out of scope (deferred)
- Mid-trip route changes ("passenger wants to be dropped off here instead")
- Multiple stops / waypoints on one trip (chaining 3+ addresses)
- Dynamic pricing based on distance or demand
- Reverse direction matching ("driver going A→B can pick up someone going B→A on the return")
- Detour cost calc ("how much extra is it for you to pick me up?")
- Albanian street name normalization / fuzzy matching beyond what Google Places returns
- Address validation against a curated Albanian address database (Google Places' results stand)

---

## Data model changes (Phase A)

```prisma
enum TripType {
  INTERCITY
  INTRACITY
}

model Trip {
  id             String     @id @default(cuid())
  driverId       String
  driver         User       @relation("DriverTrips", fields: [driverId], references: [id])

  // Existing city refs become optional (kept for filtering + legacy)
  // Auto-populated from Google Places address_components.locality on publish
  originCityId   String?
  originCity     City?      @relation("TripOrigin", fields: [originCityId], references: [id])
  destCityId     String?
  destCity       City?      @relation("TripDestination", fields: [destCityId], references: [id])

  // NEW: precise addresses
  originLat      Float
  originLng      Float
  originLabel    String     // e.g. "Rr. Myslym Shyri 12, Tiranë"
  destLat        Float
  destLng        Float
  destLabel      String

  // NEW: planned route
  routePolyline  String     // Google encoded polyline
  routeDistanceM Int        // meters
  routeDurationS Int        // seconds
  routeAltIndex  Int        @default(0)  // which alt the driver picked (0/1/2)

  // NEW: trip type + driver-controlled detour tolerance
  tripType       TripType
  maxDetourM     Int        @default(500)  // driver's willingness to deviate for pickup

  // unchanged
  departureAt    DateTime
  pricePerSeat   Decimal
  totalSeats     Int
  seatsAvailable Int
  status         TripStatus @default(SCHEDULED)
  notes          String?
  boostedUntil   DateTime?
  startedAt      DateTime?
  endedAt        DateTime?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  reservations Reservation[]
  messages     Message[]
  reviews      Review[]
  locations    TripLocation[]
}

model Reservation {
  // existing fields...

  // NEW: passenger-specific pickup/dropoff along the trip's route
  pickupLat    Float?
  pickupLng    Float?
  pickupLabel  String?
  dropoffLat   Float?
  dropoffLng   Float?
  dropoffLabel String?
}
```

Notes:
- `routePolyline` stored as encoded string (compact, ~5x smaller than JSON arrays).
- Index considerations: a basic B-tree on `(originCityId, departureAt)` is still useful for coarse filtering before the geospatial step. For real geo search at scale we'd want PostGIS, but for Albania-scale traffic plain `lat BETWEEN ... AND ...` bounding-box queries are fine.

---

## API changes (Phase B)

### `POST /api/v1/trips` — publish
New required fields: `originLat, originLng, originLabel, destLat, destLng, destLabel, routePolyline, routeDistanceM, routeDurationS, routeAltIndex`.

The mobile app calls Google Directions before posting and includes the chosen route in the payload. Server re-validates by re-calling Directions and confirming the polyline matches (or stores client polyline as authoritative — decision needed: **D8**, recommend client-authoritative for MVP, server validates only that polyline endpoints match the lat/lng pair within tolerance).

### `GET /api/v1/trips/search` — passenger search
Old query: `?originCity=X&destCity=Y&date=Z`
New query: `?originLat=&originLng=&destLat=&destLng=&date=&searchRadiusM=500&tripType=INTERCITY|INTRACITY|`

Algorithm (no PostGIS needed for MVP):
1. Coarse filter by `departureAt` ± window and optional `tripType`
2. Coarse filter by bounding box: trip's route bbox must intersect a buffered box around (pickup, dropoff)
3. For each candidate, decode polyline and run point-to-polyline distance for pickup & dropoff
4. Compute **effective buffer** = `min(trip.maxDetourM, passenger.searchRadiusM)`
5. Require pickup distance ≤ effective buffer AND dropoff distance ≤ effective buffer AND pickup-index < dropoff-index along the polyline (correct direction)
6. Return sorted by departureAt or boosted status

Step 3 runs in Node — for ~100s of candidates per query this is sub-100ms. If we grow past that, add PostGIS + `ST_DWithin` later.

### `POST /api/v1/reservations` — reserve
Optional new fields: `pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel`. If omitted, use trip's origin/dest.

### `GET /api/v1/trips/:id` — detail
Now returns `routePolyline` + `routeDistanceM` + `routeDurationS` for map rendering.

---

## Mobile UI changes (Phase C)

### Driver publish (`driver/publiko.tsx`)
- Replace city pickers with Google Places autocomplete inputs (`originLabel`, `destLabel`)
- City is auto-filled from `address_components.locality` on the chosen suggestion — invisible to driver
- After both addresses are picked, call Directions, render up to 3 polyline alternatives on a map
- Driver taps a polyline to select; selected one highlights, others dim
- Show distance + duration + estimated price suggestion
- New control: **"Sa larg pranoj pasagjerë?" / detour slider** — 100m / 300m / 500m / 1km / 2km (defaults: 500m intercity, 200m intra-city based on auto-detected `tripType`)
- "Publiko" submits with the selected polyline + `maxDetourM` + auto-derived `tripType`

### Passenger search (`(tabs)/index.tsx` or wherever search lives)
- Replace city pickers with Places autocomplete for origin/destination
- City auto-derived behind the scenes
- Keep date picker
- New filter: **"Brenda qytetit / Mes qyteteve"** — INTRACITY / INTERCITY / both
- New control: **"Sa larg pranoj të eci?" / radius slider** — 100m / 300m / 500m / 1km / 2km (defaults: 500m intercity, 200m intra-city)
- Optional: "Use my current location" button → reverse-geocode → fill origin

### Search results
Same card layout. New: show passenger's pickup pin + trip's full route on a mini-map per card (or only when card is expanded, for performance).

### Trip detail (`udhetime/[id].tsx`)
- Show route polyline (not just origin/dest pins)
- Show passenger's pickup point along the polyline
- Optionally show distance from pickup → dropoff along the route (their portion)

### Reservation flow
- New step in reservation: "Where do you want to be picked up?" / "Dropped off?"
- Default to passenger's searched pickup/dropoff
- Validate that they're within the buffer of the trip's route

---

## Search/match algorithm (Phase D)

```ts
function passengerMatchesTrip(
  trip: Trip,
  pickup: LatLng,
  dropoff: LatLng,
  passengerSearchRadiusM: number,
): boolean {
  const effectiveBuffer = Math.min(trip.maxDetourM, passengerSearchRadiusM);
  const coords = decodePolyline(trip.routePolyline); // [[lat, lng], ...]
  const pickupHit = nearestPointOnPolyline(coords, pickup);
  const dropoffHit = nearestPointOnPolyline(coords, dropoff);
  if (pickupHit.distanceM > effectiveBuffer) return false;
  if (dropoffHit.distanceM > effectiveBuffer) return false;
  if (pickupHit.index >= dropoffHit.index) return false; // wrong direction along route
  return true;
}
```

Decoding via `@mapbox/polyline`, point-to-line distance via `@turf/nearest-point-on-line`. Both small, well-maintained npm packages.

---

## Pricing (Phase E — only if D4 = B or C)

Skip if D4 = **A** (recommended). If we go per-km:

- Driver sets a `pricePerKm` instead of `pricePerSeat`
- UI shows total = `pricePerKm * routeDistanceM / 1000`
- Reservation total = `pricePerKm * (passengerSegmentDistanceM / 1000) * seats`
- Per-passenger pricing means each reservation costs different amounts based on their pickup/dropoff — significant API + UI rework

For MVP, keep flat per-seat. Re-open this in Phase 6.

---

## Migration (Phase F)

For existing trips:
1. Backfill `originLat = originCity.lat`, `originLng = originCity.lng`, `originLabel = originCity.name`; same for dest.
2. Compute `routePolyline` by calling Directions for each historical trip OR use a straight-line polyline as a placeholder.
3. Mark migrated trips with a flag so admin can identify them.

For schema:
1. Add new columns as nullable, deploy
2. Run backfill script
3. Make new columns `NOT NULL`
4. Drop old NOT NULL constraint from `originCityId/destCityId`

This is a 2-deploy migration — staging required before prod.

---

## Phasing & estimated effort

| Phase | What | Why first | Est. effort |
|-------|------|-----------|-------------|
| A | Schema + Prisma migration + backfill script | Foundation; everything downstream depends on the data model | 1 day |
| B | API: publish accepts lat/lng + polyline; search uses geo query; reservation captures pickup/dropoff | Backend has to work before mobile can | 2-3 days |
| C | Mobile driver publish — Places autocomplete + route picker | Driver-side is more complex; passenger side is easier afterward | 2 days |
| D | Mobile passenger search + reservation pickup/dropoff UI | Builds on Phase C patterns | 2 days |
| E | Trip detail map — polyline rendering | Quick win once Phase C is done | 0.5 day |
| F | QA + edge cases (no internet at publish time, Directions API quota errors, very short intra-city trips with degenerate polylines) | Pre-ship checks | 1-2 days |

**Total: 8-11 days of focused work**, plus Google Places API setup + cost monitoring.

---

## Risks & concerns

- **Google Places + Directions cost**: pricing is per-request. With ~100 active drivers publishing 2 trips/day + ~500 searches/day, expect ~$20-50/month. Cache aggressively; debounce autocomplete keystrokes.
- **Albanian address quality**: outside Tirana/Durrës/Vlorë, Places coverage drops. Drivers may need to drop a pin on the map instead of typing. **Must support both** in the UI.
- **Polyline storage**: encoded polylines for cross-country routes are ~2KB. 100k trips = 200MB. Fine in Postgres.
- **Search performance**: at >1k concurrent trips, the in-Node polyline scan starts to hurt. Plan to migrate to PostGIS `ST_DWithin` if/when we hit that.
- **Live GPS overlay**: now we'll see real path vs planned path. If drivers deviate a lot, passengers may panic. Add a "Driver is taking an alternate route" notice when deviation > 1km. (Polish item, Phase G.)

---

## Status

All design decisions locked (see "Locked decisions" section at top). Ready to start Phase A — Prisma schema + migration + backfill script.

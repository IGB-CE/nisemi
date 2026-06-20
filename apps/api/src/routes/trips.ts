import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushNotifications } from '../lib/push.js';
import { endTripRoom } from '../realtime/index.js';
import { matchesRoute, validatePolylineEndpoints } from '../lib/routeMatch.js';
import { notifyMatchingAlerts } from '../lib/rideAlerts.js';
import { driverHasOverlappingTrip, isAdmin, isWithinCancelWindow } from '../lib/tripRules.js';
import { getPassengerStats } from '../lib/passengerStats.js';

const router = Router();

const latLng = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();

const tripSchema = z.object({
  originCityId: z.string().optional(),
  destCityId: z.string().optional(),
  originLat: z.number().min(-90).max(90).optional(),
  originLng: z.number().min(-180).max(180).optional(),
  originLabel: z.string().min(1).max(300).optional(),
  destLat: z.number().min(-90).max(90).optional(),
  destLng: z.number().min(-180).max(180).optional(),
  destLabel: z.string().min(1).max(300).optional(),
  routePolyline: z.string().min(2).optional(),
  routeDistanceM: z.number().int().nonnegative().optional(),
  routeDurationS: z.number().int().nonnegative().optional(),
  routeAltIndex: z.number().int().min(0).max(5).optional(),
  tripType: z.enum(['INTERCITY', 'INTRACITY']).optional(),
  maxDetourM: z.number().int().min(50).max(5000).optional(),
  genderRestriction: z.enum(['ANY', 'FEMALE_ONLY', 'MALE_ONLY']).optional(),
  departureAt: z.string().datetime(),
  pricePerSeat: z.number().positive(),
  totalSeats: z.number().int().min(1).max(8),
  notes: z.string().optional(),
});

const searchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  date: z.string().optional(),
  seats: z.coerce.number().int().min(1).optional().default(1),
  originLat: z.coerce.number().min(-90).max(90).optional(),
  originLng: z.coerce.number().min(-180).max(180).optional(),
  destLat: z.coerce.number().min(-90).max(90).optional(),
  destLng: z.coerce.number().min(-180).max(180).optional(),
  searchRadiusM: z.coerce.number().int().min(50).max(5000).optional().default(500),
  tripType: z.enum(['INTERCITY', 'INTRACITY']).optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { from, to, date, seats, originLat, originLng, destLat, destLng, searchRadiusM, tripType } = parsed.data;

  const isGeoSearch =
    originLat !== undefined && originLng !== undefined && destLat !== undefined && destLng !== undefined;

  let callerGender: 'MALE' | 'FEMALE' | 'UNSPECIFIED' = 'UNSPECIFIED';
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { verifyToken } = await import('../lib/jwt.js');
      const payload = verifyToken(authHeader.slice(7));
      const u = await prisma.user.findUnique({ where: { id: payload.sub }, select: { gender: true } });
      if (u) callerGender = u.gender;
    } catch {
      // ignore — treat as unauthenticated
    }
  }

  const allowedRestrictions: ('ANY' | 'FEMALE_ONLY' | 'MALE_ONLY')[] = ['ANY'];
  if (callerGender === 'FEMALE') allowedRestrictions.push('FEMALE_ONLY');
  if (callerGender === 'MALE') allowedRestrictions.push('MALE_ONLY');

  const where: Record<string, unknown> = {
    status: 'SCHEDULED',
    seatsAvailable: { gte: seats },
    departureAt: { gte: new Date() },
    genderRestriction: { in: allowedRestrictions },
  };
  if (from) where.originCityId = from;
  if (to) where.destCityId = to;
  if (tripType) where.tripType = tripType;
  if (isGeoSearch) where.routePolyline = { not: null };
  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.departureAt = { gte: d, lt: next };
  }

  const trips = await prisma.trip.findMany({
    where,
    include: {
      originCity: true,
      destCity: true,
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          driverProfile: { select: { rating: true, verificationStatus: true } },
        },
      },
    },
    orderBy: { departureAt: 'asc' },
  });

  let filtered = trips;
  if (isGeoSearch) {
    const pickup = { lat: originLat!, lng: originLng! };
    const dropoff = { lat: destLat!, lng: destLng! };
    filtered = trips.filter((t) => {
      if (!t.routePolyline) return false;
      const result = matchesRoute({
        routePolyline: t.routePolyline,
        driverMaxDetourM: t.maxDetourM,
        pickup,
        dropoff,
        passengerSearchRadiusM: searchRadiusM,
      });
      return result.matched;
    });
  }

  const now = Date.now();
  const sorted = [...filtered].sort((a, b) => {
    const aBoosted = a.boostedUntil && a.boostedUntil.getTime() > now ? 1 : 0;
    const bBoosted = b.boostedUntil && b.boostedUntil.getTime() > now ? 1 : 0;
    if (aBoosted !== bBoosted) return bBoosted - aBoosted;
    return a.departureAt.getTime() - b.departureAt.getTime();
  });
  res.json(sorted);
});

router.post('/:id/boost', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (trip.status !== 'SCHEDULED') {
    res.status(400).json({ error: 'Vetëm udhëtimet aktive mund të promovohen' });
    return;
  }
  const boostedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const updated = await prisma.trip.update({
    where: { id: req.params.id },
    data: { boostedUntil },
    select: { id: true, boostedUntil: true },
  });
  res.json(updated);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = tripSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: req.userId } });
  if (!driverProfile) {
    res.status(403).json({ error: 'Must have a driver profile to publish trips' });
    return;
  }

  const data = parsed.data;

  if (!data.originCityId && (data.originLat === undefined || data.originLng === undefined)) {
    res.status(400).json({ error: 'Origin city or coordinates required' });
    return;
  }
  if (!data.destCityId && (data.destLat === undefined || data.destLng === undefined)) {
    res.status(400).json({ error: 'Destination city or coordinates required' });
    return;
  }

  if (
    data.routePolyline &&
    data.originLat !== undefined &&
    data.originLng !== undefined &&
    data.destLat !== undefined &&
    data.destLng !== undefined
  ) {
    // Directions snaps origin/dest to the nearest routable road, which can be
    // several hundred metres from an address centroid or Plus Code. Use a loose
    // tolerance so this only rejects a grossly mismatched/forged polyline.
    const valid = validatePolylineEndpoints(
      data.routePolyline,
      { lat: data.originLat, lng: data.originLng },
      { lat: data.destLat, lng: data.destLng },
      1000,
    );
    if (!valid) {
      res.status(400).json({ error: 'Route polyline endpoints do not match origin/destination' });
      return;
    }
  }

  const departureAt = new Date(data.departureAt);

  if (!isAdmin(req.userRole)) {
    if (isWithinCancelWindow(departureAt)) {
      res.status(400).json({
        error: 'Ora e nisjes duhet të jetë të paktën 1 orë nga tani',
      });
      return;
    }
    const overlap = await driverHasOverlappingTrip(req.userId!, departureAt, data.routeDurationS ?? null);
    if (overlap) {
      res.status(400).json({
        error: 'Keni një udhëtim tjetër aktiv që mbivendoset me këtë orë nisjeje',
      });
      return;
    }
  }

  const { totalSeats, ...rest } = data;
  const trip = await prisma.trip.create({
    data: {
      ...rest,
      totalSeats,
      seatsAvailable: totalSeats,
      driverId: req.userId!,
      departureAt,
    },
    include: { originCity: true, destCity: true },
  });
  notifyMatchingAlerts(trip.id).catch((e) => console.error('[rideAlert] notify failed', e));
  res.status(201).json(trip);
});

const hideSchema = z.object({ tripIds: z.array(z.string()).min(1).max(500) });

// Hide one or more past trips from the caller's own history. This is a
// per-user soft hide (mirrors ConversationDeletion) — the trip, its reviews
// and ratings stay intact for the other party.
router.post('/hide', requireAuth, async (req: AuthRequest, res) => {
  const parsed = hideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = req.userId!;
  const trips = await prisma.trip.findMany({
    where: {
      id: { in: parsed.data.tripIds },
      OR: [{ driverId: userId }, { reservations: { some: { passengerId: userId } } }],
    },
    select: {
      id: true,
      status: true,
      departureAt: true,
      driverId: true,
      reservations: { where: { passengerId: userId }, select: { status: true } },
    },
  });

  // Only past/finished trips belong in history. A trip is still "active" for the
  // driver while it's upcoming or in progress; for a passenger it's only active
  // while they hold a live (pending/accepted) booking — a rejected or cancelled
  // booking on an upcoming trip is already history from their side.
  const now = Date.now();
  const tripIsLive = (t: { status: string; departureAt: Date }) =>
    t.status === 'IN_PROGRESS' || (t.status === 'SCHEDULED' && t.departureAt.getTime() > now);
  const hideable = trips.filter((t) => {
    if (!tripIsLive(t)) return true;
    if (t.driverId === userId) return false;
    return !t.reservations.some((r) => r.status === 'PENDING' || r.status === 'ACCEPTED');
  });
  if (hideable.length === 0) {
    res.status(400).json({ error: 'Nuk ka udhëtime për të fshirë nga historiku' });
    return;
  }

  await prisma.tripHistoryHidden.createMany({
    data: hideable.map((t) => ({ userId, tripId: t.id })),
    skipDuplicates: true,
  });
  res.json({ hidden: hideable.length });
});

router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  const trips = await prisma.trip.findMany({
    where: { driverId: req.userId, hiddenBy: { none: { userId: req.userId } } },
    include: {
      originCity: true,
      destCity: true,
      reservations: {
        include: { passenger: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      },
    },
    orderBy: { departureAt: 'desc' },
  });
  res.json(trips);
});

router.get('/:id', async (req, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
    include: {
      originCity: true,
      destCity: true,
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          driverProfile: {
            select: {
              carModel: true,
              carColor: true,
              carPlate: true,
              carPhotoUrl: true,
              rating: true,
              totalTrips: true,
              verificationStatus: true,
              verifiedAt: true,
              createdAt: true,
            },
          },
        },
      },
      reservations: {
        where: { status: { in: ['PENDING', 'ACCEPTED'] } },
        select: {
          id: true,
          seats: true,
          status: true,
          pickupLat: true,
          pickupLng: true,
          pickupLabel: true,
          dropoffLat: true,
          dropoffLng: true,
          dropoffLabel: true,
          passenger: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      passengerRatings: { select: { passengerId: true, liked: true } },
    },
  });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }

  // Attach each passenger's reputation (completed trips + like ratio) and the
  // driver's own like/dislike for this trip, so the reservation screen can show
  // the badge and pre-fill the rating buttons.
  const statsMap = await getPassengerStats(trip.reservations.map((r) => r.passenger.id));
  const ratingMap = new Map(trip.passengerRatings.map((r) => [r.passengerId, r.liked]));
  const { passengerRatings, ...tripRest } = trip;
  const enriched = {
    ...tripRest,
    reservations: trip.reservations.map((r) => ({
      ...r,
      passenger: { ...r.passenger, stats: statsMap.get(r.passenger.id) ?? null },
      myRating: ratingMap.has(r.passenger.id) ? ratingMap.get(r.passenger.id) : null,
    })),
  };
  res.json(enriched);
});

router.post('/:id/start', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (trip.status !== 'SCHEDULED') {
    res.status(400).json({ error: 'Udhëtimi nuk mund të fillojë në këtë gjendje' });
    return;
  }
  const updated = await prisma.trip.update({
    where: { id: req.params.id },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  const accepted = await prisma.reservation.findMany({
    where: { tripId: req.params.id, status: 'ACCEPTED' },
    include: { passenger: { include: { pushTokens: true } } },
  });
  const tokens = accepted.flatMap((r) => r.passenger.pushTokens.map((t) => t.token));
  if (tokens.length) {
    await sendPushNotifications(
      tokens,
      'Udhëtimi nisi',
      'Shoferi nisi udhëtimin. Mund të ndiqni vendndodhjen në kohë reale.',
      { type: 'trip', tripId: req.params.id },
    );
  }

  res.json(updated);
});

router.post('/:id/end', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (trip.status !== 'IN_PROGRESS') {
    res.status(400).json({ error: 'Udhëtimi nuk është në vazhdim' });
    return;
  }
  const updated = await prisma.trip.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED', endedAt: new Date() },
  });
  await endTripRoom(req.params.id);

  const accepted = await prisma.reservation.findMany({
    where: { tripId: req.params.id, status: 'ACCEPTED' },
    include: { passenger: { include: { pushTokens: true } } },
  });
  const endTokens = accepted.flatMap((r) => r.passenger.pushTokens.map((t) => t.token));
  if (endTokens.length) {
    void sendPushNotifications(
      endTokens,
      'Udhëtimi përfundoi',
      'Faleminderit që udhëtuat me Nisemi! Vlerësoni shoferin tuaj.',
      { type: 'reservation', tripId: req.params.id },
    );
  }

  res.json(updated);
});

router.get('/:id/locations', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const isDriver = trip.driverId === req.userId;
  let isAcceptedPassenger = false;
  if (!isDriver) {
    const reservation = await prisma.reservation.findFirst({
      where: { tripId: req.params.id, passengerId: req.userId, status: 'ACCEPTED' },
    });
    isAcceptedPassenger = Boolean(reservation);
  }
  if (!isDriver && !isAcceptedPassenger && req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const locations = await prisma.tripLocation.findMany({
    where: { tripId: req.params.id },
    orderBy: { recordedAt: 'asc' },
    select: {
      lat: true,
      lng: true,
      heading: true,
      speed: true,
      accuracy: true,
      recordedAt: true,
    },
  });
  res.json(locations);
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
    include: { originCity: true, destCity: true },
  });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId && !isAdmin(req.userRole)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!isAdmin(req.userRole) && isWithinCancelWindow(trip.departureAt)) {
    const hasActiveReservations = await prisma.reservation.count({
      where: { tripId: req.params.id, status: { in: ['PENDING', 'ACCEPTED'] } },
    });
    if (hasActiveReservations > 0) {
      res.status(400).json({
        error: 'Nuk mund të anuloni udhëtimin më pak se 60 minuta para nisjes kur ka rezervime aktive',
      });
      return;
    }
  }

  const wasInProgress = trip.status === 'IN_PROGRESS';

  const affected = await prisma.reservation.findMany({
    where: { tripId: req.params.id, status: { in: ['PENDING', 'ACCEPTED'] } },
    include: { passenger: { include: { pushTokens: true } } },
  });

  const updated = await prisma.trip.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  if (wasInProgress) {
    await endTripRoom(req.params.id);
  }

  const cancelTokens = affected.flatMap((r) => r.passenger.pushTokens.map((t) => t.token));
  if (cancelTokens.length) {
    void sendPushNotifications(
      cancelTokens,
      'Udhëtimi u anulua',
      `Shoferi anuloi udhëtimin ${trip.originCity?.name ?? trip.originLabel ?? 'Origjina'} → ${trip.destCity?.name ?? trip.destLabel ?? 'Destinacioni'}.`,
      { type: 'reservation', tripId: req.params.id },
    );
  }

  res.json(updated);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const parsed = tripSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;

  const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (existing.driverId !== req.userId && !isAdmin(req.userRole)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (existing.status !== 'SCHEDULED') {
    res.status(400).json({ error: 'Mund të modifikohen vetëm udhëtimet e planifikuara' });
    return;
  }
  const reservationCount = await prisma.reservation.count({ where: { tripId: req.params.id } });
  if (reservationCount > 0) {
    res.status(400).json({ error: 'Nuk mund të modifikoni një udhëtim që ka rezervime' });
    return;
  }

  if (!data.originCityId && (data.originLat === undefined || data.originLng === undefined)) {
    res.status(400).json({ error: 'Origin city or coordinates required' });
    return;
  }
  if (!data.destCityId && (data.destLat === undefined || data.destLng === undefined)) {
    res.status(400).json({ error: 'Destination city or coordinates required' });
    return;
  }
  if (
    data.routePolyline &&
    data.originLat !== undefined &&
    data.originLng !== undefined &&
    data.destLat !== undefined &&
    data.destLng !== undefined
  ) {
    const valid = validatePolylineEndpoints(
      data.routePolyline,
      { lat: data.originLat, lng: data.originLng },
      { lat: data.destLat, lng: data.destLng },
      1000,
    );
    if (!valid) {
      res.status(400).json({ error: 'Route polyline endpoints do not match origin/destination' });
      return;
    }
  }

  const departureAt = new Date(data.departureAt);
  if (!isAdmin(req.userRole)) {
    if (isWithinCancelWindow(departureAt)) {
      res.status(400).json({ error: 'Ora e nisjes duhet të jetë të paktën 1 orë nga tani' });
      return;
    }
    const overlap = await driverHasOverlappingTrip(
      req.userId!,
      departureAt,
      data.routeDurationS ?? null,
      req.params.id,
    );
    if (overlap) {
      res.status(400).json({ error: 'Keni një udhëtim tjetër aktiv që mbivendoset me këtë orë nisjeje' });
      return;
    }
  }

  const { totalSeats, ...rest } = data;
  const trip = await prisma.trip.update({
    where: { id: req.params.id },
    data: { ...rest, totalSeats, seatsAvailable: totalSeats, departureAt },
    include: { originCity: true, destCity: true },
  });
  res.json(trip);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId && !isAdmin(req.userRole)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  // Only allow a hard delete when nothing references the trip; otherwise the
  // driver should cancel it (which keeps the record and notifies passengers).
  const [reservations, messages, reviews] = await Promise.all([
    prisma.reservation.count({ where: { tripId: req.params.id } }),
    prisma.message.count({ where: { tripId: req.params.id } }),
    prisma.review.count({ where: { tripId: req.params.id } }),
  ]);
  if (reservations > 0 || messages > 0 || reviews > 0) {
    res.status(400).json({ error: 'Ky udhëtim ka ndërveprime — anuloni atë në vend që ta fshini.' });
    return;
  }
  await prisma.trip.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
